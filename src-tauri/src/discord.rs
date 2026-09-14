use crate::models::DiscordPresencePayload;
use discord_rich_presence::{
    activity::{self, ActivityType},
    DiscordIpc, DiscordIpcClient,
};
use std::sync::mpsc::{self, RecvTimeoutError, Sender};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const HEARTBEAT: Duration = Duration::from_secs(12);

pub fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}

pub fn steam_header_url(steam_app_id: Option<i64>) -> Option<String> {
    steam_app_id
        .filter(|id| *id > 0)
        .map(|id| format!("https://cdn.cloudflare.steamstatic.com/steam/apps/{id}/header.jpg"))
}

#[derive(Clone)]
pub struct DiscordRpc {
    tx: Sender<RpcCommand>,
}

enum RpcCommand {
    Configure { enabled: bool, client_id: String },
    Set(PresenceActivity),
    Clear,
}

#[derive(Clone)]
struct PresenceActivity {
    details: String,
    state: String,
    large_image: Option<String>,
    large_text: Option<String>,
    start: Option<i64>,
}

struct RpcState {
    enabled: bool,
    client_id: String,
    client: Option<DiscordIpcClient>,
    last: Option<PresenceActivity>,
    /// Skip large_image after Discord rejects an unknown asset key.
    omit_assets: bool,
}

impl DiscordRpc {
    pub fn start() -> Self {
        let (tx, rx) = mpsc::channel();
        let _ = std::thread::Builder::new()
            .name("discord-rpc".into())
            .spawn(move || {
                let mut state = RpcState {
                    enabled: false,
                    client_id: String::new(),
                    client: None,
                    last: None,
                    omit_assets: false,
                };
                loop {
                    match rx.recv_timeout(HEARTBEAT) {
                        Ok(RpcCommand::Configure { enabled, client_id }) => {
                            apply_configure(&mut state, enabled, client_id);
                        }
                        Ok(RpcCommand::Set(activity)) => {
                            state.last = Some(activity.clone());
                            state.omit_assets = false;
                            publish(&mut state, &activity);
                        }
                        Ok(RpcCommand::Clear) => {
                            state.last = None;
                            clear_activity(&mut state);
                        }
                        Err(RecvTimeoutError::Timeout) => {
                            heartbeat(&mut state);
                        }
                        Err(RecvTimeoutError::Disconnected) => break,
                    }
                }
            });
        Self { tx }
    }

    pub fn configure(&self, enabled: bool, client_id: String) {
        let _ = self.tx.send(RpcCommand::Configure { enabled, client_id });
    }

    pub fn set_idle(&self) {
        let _ = self.tx.send(RpcCommand::Set(PresenceActivity {
            details: "Browsing library".into(),
            state: "Looking at games".into(),
            large_image: Some("slifer".into()),
            large_text: Some("Slifer Launcher".into()),
            start: Some(unix_now()),
        }));
    }

    pub fn set_playing(
        &self,
        name: &str,
        profile_label: Option<&str>,
        image: Option<String>,
        start: i64,
    ) {
        let state = match profile_label.filter(|value| !value.trim().is_empty()) {
            Some(label) => format!("{label} · via Slifer"),
            None => "via Slifer".into(),
        };
        let _ = self.tx.send(RpcCommand::Set(PresenceActivity {
            details: format!("Playing {name}"),
            state,
            large_image: image.or_else(|| Some("slifer".into())),
            large_text: Some(name.to_string()),
            start: Some(start),
        }));
    }

    pub fn set_payload(&self, payload: DiscordPresencePayload) {
        let _ = self.tx.send(RpcCommand::Set(PresenceActivity {
            details: payload.details,
            state: payload.state.unwrap_or_default(),
            large_image: payload.large_image,
            large_text: payload.large_text,
            start: payload.start_timestamp,
        }));
    }

    pub fn clear(&self) {
        let _ = self.tx.send(RpcCommand::Clear);
    }
}

fn apply_configure(state: &mut RpcState, enabled: bool, client_id: String) {
    let id_changed = state.client_id != client_id;
    state.enabled = enabled;
    state.client_id = client_id;
    state.omit_assets = false;

    if !enabled || state.client_id.is_empty() {
        close_client(state);
        return;
    }

    if id_changed {
        close_client(state);
    }

    if ensure_client(state).is_some() {
        if let Some(last) = state.last.clone() {
            publish(state, &last);
        } else {
            let idle = PresenceActivity {
                details: "Browsing library".into(),
                state: "Looking at games".into(),
                large_image: Some("slifer".into()),
                large_text: Some("Slifer Launcher".into()),
                start: Some(unix_now()),
            };
            state.last = Some(idle.clone());
            publish(state, &idle);
        }
    }
}

fn heartbeat(state: &mut RpcState) {
    if !state.enabled || state.client_id.is_empty() {
        return;
    }
    if let Some(last) = state.last.clone() {
        // Force reconnect if the pipe died, then republish so presence sticks.
        if state.client.is_none() {
            let _ = ensure_client(state);
        }
        publish(state, &last);
    }
}

fn ensure_client(state: &mut RpcState) -> Option<&mut DiscordIpcClient> {
    if !state.enabled || state.client_id.is_empty() {
        return None;
    }

    if state.client.is_none() {
        match DiscordIpcClient::new(&state.client_id) {
            Ok(mut client) => match client.connect() {
                Ok(()) => state.client = Some(client),
                Err(error) => {
                    eprintln!("discord rpc connect failed: {error}");
                }
            },
            Err(error) => {
                eprintln!("discord rpc client failed: {error}");
            }
        }
    }

    state.client.as_mut()
}

fn publish(state: &mut RpcState, payload: &PresenceActivity) {
    if ensure_client(state).is_none() {
        return;
    }

    if set_activity(state, payload).is_ok() {
        return;
    }

    close_client(state);
    if ensure_client(state).is_some() {
        let _ = set_activity(state, payload);
    }
}

fn set_activity(state: &mut RpcState, payload: &PresenceActivity) -> Result<(), String> {
    let omit_assets = state.omit_assets;
    let first_error = {
        let client = state.client.as_mut().ok_or("discord rpc not connected")?;
        match client.set_activity(build_activity(payload, !omit_assets)) {
            Ok(()) => return Ok(()),
            Err(error) => error.to_string(),
        }
    };

    if omit_assets {
        return Err(first_error);
    }

    // Missing Rich Presence asset keys can make Discord drop the activity.
    state.omit_assets = true;
    let client = state.client.as_mut().ok_or(first_error)?;
    client
        .set_activity(build_activity(payload, false))
        .map_err(|err| err.to_string())
}

fn build_activity<'a>(payload: &'a PresenceActivity, with_assets: bool) -> activity::Activity<'a> {
    let mut next = activity::Activity::new()
        .activity_type(ActivityType::Playing)
        .details(payload.details.as_str());
    if !payload.state.is_empty() {
        next = next.state(payload.state.as_str());
    }
    if let Some(start) = payload.start {
        next = next.timestamps(activity::Timestamps::new().start(start));
    }
    if with_assets {
        // Only Developer Portal asset keys — URLs make Discord drop the activity.
        let image_key = payload
            .large_image
            .as_deref()
            .filter(|value| !value.is_empty() && !value.starts_with("http"))
            .unwrap_or("slifer");
        let mut assets = activity::Assets::new().large_image(image_key);
        if let Some(text) = payload.large_text.as_deref() {
            assets = assets.large_text(text);
        }
        next = next.assets(assets);
    } else if let Some(text) = payload.large_text.as_deref() {
        next = next.assets(activity::Assets::new().large_text(text));
    }
    next
}

fn clear_activity(state: &mut RpcState) {
    if let Some(client) = state.client.as_mut() {
        let _ = client.clear_activity();
    }
}

fn close_client(state: &mut RpcState) {
    if let Some(mut client) = state.client.take() {
        let _ = client.close();
    }
}
