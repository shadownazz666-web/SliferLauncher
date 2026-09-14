use crate::booster;
use crate::db::Database;
use crate::discord::{self, DiscordRpc};
use crate::models::{LaunchProfile, LaunchResult, LibraryGame, SessionEnded, SessionStarted};
use std::collections::HashMap;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager};

pub const SESSION_STARTED_EVENT: &str = "game-session-started";
pub const SESSION_ENDED_EVENT: &str = "game-session-ended";

#[derive(Clone, Default)]
pub struct SessionTracker {
    running: Arc<Mutex<HashMap<String, u32>>>,
}

impl SessionTracker {
    pub fn insert(&self, game_id: String, pid: u32) -> Result<(), String> {
        let mut running = self.running.lock().map_err(|_| "session lock poisoned")?;
        if running.contains_key(&game_id) {
            return Err("that title is already running".into());
        }
        running.insert(game_id, pid);
        Ok(())
    }

    pub fn insert_pid(&self, game_id: &str, pid: u32) {
        if let Ok(mut running) = self.running.lock() {
            running.insert(game_id.to_string(), pid);
        }
    }

    pub fn remove(&self, game_id: &str) {
        if let Ok(mut running) = self.running.lock() {
            running.remove(game_id);
        }
    }

    pub fn running_ids(&self) -> Vec<String> {
        self.running
            .lock()
            .map(|running| running.keys().cloned().collect())
            .unwrap_or_default()
    }
}

pub fn launch_game(
    app: AppHandle,
    db: Database,
    tracker: SessionTracker,
    game_id: String,
    profile_id: Option<String>,
    booster_enabled: bool,
) -> Result<LaunchResult, String> {
    let game = db
        .get_game(&game_id)?
        .ok_or_else(|| format!("game {game_id} not found"))?;

    let resolved = resolve_launch(&game, profile_id.as_deref())?;
    if !Path::new(&resolved.exe_path).exists() {
        return Err(format!("executable missing: {}", resolved.exe_path));
    }

    tracker.insert(game_id.clone(), 0)?;
    let mut child = match spawn_resolved(&resolved) {
        Ok(child) => child,
        Err(error) => {
            tracker.remove(&game_id);
            return Err(error);
        }
    };
    let pid = child.id();
    tracker.insert_pid(&game_id, pid);

    if booster_enabled {
        booster::engage(&app);
    }

    let display_name = game
        .display_name
        .clone()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| game.name.clone());

    if let Some(rpc) = app.try_state::<DiscordRpc>() {
        rpc.set_playing(
            &display_name,
            resolved.profile_label.as_deref(),
            discord::steam_header_url(game.steam_app_id),
            discord::unix_now(),
        );
    }

    let _ = app.emit(
        SESSION_STARTED_EVENT,
        SessionStarted {
            game_id: game_id.clone(),
            game_name: display_name,
            steam_app_id: game.steam_app_id,
            pid,
            profile_id: resolved.profile_id.clone(),
            profile_label: resolved.profile_label.clone(),
        },
    );

    let app_for_wait = app.clone();
    let tracker_for_wait = tracker.clone();
    let db_for_wait = db;
    let waited_id = game_id.clone();
    let booster_for_wait = booster_enabled;

    tauri::async_runtime::spawn(async move {
        let started = Instant::now();
        let _ = tauri::async_runtime::spawn_blocking(move || child.wait()).await;
        let session_seconds = started.elapsed().as_secs();
        tracker_for_wait.remove(&waited_id);

        if booster_for_wait && tracker_for_wait.running_ids().is_empty() {
            booster::disengage(&app_for_wait);
        }

        if tracker_for_wait.running_ids().is_empty() {
            if let Some(rpc) = app_for_wait.try_state::<DiscordRpc>() {
                rpc.set_idle();
            }
        }

        match db_for_wait.record_play_session(&waited_id, session_seconds) {
            Ok(updated) => {
                let _ = app_for_wait.emit(
                    SESSION_ENDED_EVENT,
                    SessionEnded {
                        game: updated,
                        pid,
                        session_seconds,
                    },
                );
            }
            Err(error) => {
                eprintln!("failed to record play session for {waited_id}: {error}");
            }
        }
    });

    Ok(LaunchResult {
        game_id,
        pid,
        profile_id: resolved.profile_id,
        profile_label: resolved.profile_label,
    })
}

struct ResolvedLaunch {
    exe_path: String,
    args: String,
    working_dir: String,
    profile_id: Option<String>,
    profile_label: Option<String>,
}

fn resolve_launch(game: &LibraryGame, profile_id: Option<&str>) -> Result<ResolvedLaunch, String> {
    let selected_id = profile_id
        .map(str::to_string)
        .or_else(|| game.default_profile_id.clone());

    let profile: Option<&LaunchProfile> = selected_id.as_ref().and_then(|id| {
        game.launch_profiles.iter().find(|profile| profile.id == *id)
    });

    let exe_path = profile
        .and_then(|profile| profile.exe_path.clone())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| game.exe_path.clone());

    let args = profile
        .and_then(|profile| profile.args.clone())
        .or_else(|| game.launch_args.clone())
        .unwrap_or_default();

    let working_dir = profile
        .and_then(|profile| profile.working_dir.clone())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| {
            if Path::new(&game.install_dir).is_dir() {
                game.install_dir.clone()
            } else {
                Path::new(&exe_path)
                    .parent()
                    .and_then(|path| path.to_str())
                    .unwrap_or(".")
                    .to_string()
            }
        });

    Ok(ResolvedLaunch {
        exe_path,
        args,
        working_dir,
        profile_id: profile.map(|item| item.id.clone()),
        profile_label: profile.map(|item| item.label.clone()),
    })
}

fn spawn_resolved(resolved: &ResolvedLaunch) -> Result<Child, String> {
    let mut command = Command::new(&resolved.exe_path);
    command.current_dir(&resolved.working_dir);
    command.args(parse_launch_args(&resolved.args));
    command.stdin(Stdio::null());
    command.stdout(Stdio::null());
    command.stderr(Stdio::null());

    command
        .spawn()
        .map_err(|error| format!("launch failed: {error}"))
}

fn parse_launch_args(input: &str) -> Vec<String> {
    let mut args = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;

    for character in input.chars() {
        match character {
            '"' => in_quotes = !in_quotes,
            character if character.is_whitespace() && !in_quotes => {
                if !current.is_empty() {
                    args.push(std::mem::take(&mut current));
                }
            }
            character => current.push(character),
        }
    }

    if !current.is_empty() {
        args.push(current);
    }

    args
}
