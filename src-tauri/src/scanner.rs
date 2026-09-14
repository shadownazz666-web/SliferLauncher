mod epic;
mod exe;
mod filters;
mod gog;
mod paths;
mod registry;
pub(crate) mod steam;
mod xbox;

use crate::db::{normalize_path, Database, UpsertKind};
use crate::models::{DetectedGame, LibraryGame, Platform, ScanProgress, ScanResult};
use std::path::{Path, PathBuf};

pub fn scan_and_persist(
    db: &Database,
    mut on_progress: impl FnMut(ScanProgress),
) -> Result<ScanResult, String> {
    let mut detected = Vec::new();

    emit(
        &mut on_progress,
        "registry",
        "Reading uninstall registry keys",
        0,
        0,
    );
    detected.extend(registry::scan_uninstall_registry());

    emit(
        &mut on_progress,
        "steam",
        "Scanning Steam libraries",
        detected.len() as u32,
        0,
    );
    detected.extend(steam::scan_steam_libraries());

    emit(
        &mut on_progress,
        "epic",
        "Scanning Epic Games installs",
        detected.len() as u32,
        0,
    );
    detected.extend(epic::scan_epic_games());

    emit(
        &mut on_progress,
        "gog",
        "Scanning GOG Galaxy titles",
        detected.len() as u32,
        0,
    );
    detected.extend(gog::scan_gog_games());

    emit(
        &mut on_progress,
        "xbox",
        "Scanning Xbox / WinStore folders",
        detected.len() as u32,
        0,
    );
    detected.extend(xbox::scan_xbox_games());

    let merged = merge_detected(detected);
    let found = merged.len() as u32;
    let mut inserted = 0;
    let mut updated = 0;

    emit(
        &mut on_progress,
        "saving",
        "Writing new titles into the library",
        found,
        0,
    );

    for game in merged {
        match db.upsert_detected(&game)? {
            UpsertKind::Inserted => inserted += 1,
            UpsertKind::Updated => updated += 1,
        }
        emit(
            &mut on_progress,
            "saving",
            &format!("Indexed {}", game.name),
            found,
            inserted + updated,
        );
    }

    purge_non_games(db)?;
    let games = db.list_games()?;
    emit(
        &mut on_progress,
        "done",
        "Scan complete",
        found,
        inserted + updated,
    );

    Ok(ScanResult {
        found,
        inserted,
        updated,
        games,
    })
}

pub fn add_manual_game(db: &Database, exe_path: &str) -> Result<LibraryGame, String> {
    let exe = PathBuf::from(exe_path.trim());
    if !exe.is_file() {
        return Err("That executable could not be found.".into());
    }
    let is_exe = exe
        .extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| ext.eq_ignore_ascii_case("exe"));
    if !is_exe {
        return Err("Pick a .exe file to add.".into());
    }

    let install_dir = exe
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| exe.clone());
    let detected = DetectedGame {
        name: display_name_from_exe(&exe),
        exe_path: exe,
        install_dir,
        platform: platform_from_path(exe_path),
        collection_tag: Some("Manual".into()),
        steam_app_id: None,
    };

    db.upsert_detected(&detected)?;
    let id = crate::db::game_id(&normalize_path(&detected.exe_path));
    db.get_game(&id)?
        .ok_or_else(|| "Game was added but could not be reloaded.".into())
}

pub fn purge_non_games(db: &Database) -> Result<u32, String> {
    let mut deleted = 0;
    for game in db.list_games()? {
        let install_missing = !Path::new(&game.install_dir).exists();
        let manual = game
            .collection_tag
            .as_deref()
            .is_some_and(|tag| tag.eq_ignore_ascii_case("manual"));
        let keep = manual
            || filters::should_keep_library_game(&game.name, game.platform, &game.install_dir);
        if keep && !install_missing {
            continue;
        }
        db.delete_game(&game.id)?;
        deleted += 1;
    }
    Ok(deleted)
}

fn display_name_from_exe(exe: &Path) -> String {
    const SKIP: &[&str] = &[
        "win64",
        "win32",
        "x64",
        "x86",
        "binaries",
        "bin",
        "shipping",
        "game",
        "content",
        "retail",
        "binaries",
    ];
    let mut current = exe.parent();
    while let Some(dir) = current {
        let name = dir
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("");
        if !name.is_empty()
            && !SKIP.iter().any(|skip| name.eq_ignore_ascii_case(skip))
        {
            return name.to_string();
        }
        current = dir.parent();
    }
    exe.file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("Unknown Game")
        .to_string()
}

fn platform_from_path(path: &str) -> Platform {
    let haystack = path.to_ascii_lowercase().replace('/', "\\");
    if haystack.contains("\\steamapps\\") {
        Platform::Steam
    } else if haystack.contains("\\epic games\\") || haystack.contains("\\epicgames\\") {
        Platform::Epic
    } else if haystack.contains("\\gog galaxy\\") || haystack.contains("\\gog games\\") {
        Platform::GOG
    } else {
        Platform::Custom
    }
}

fn merge_detected(games: Vec<DetectedGame>) -> Vec<DetectedGame> {
    let mut by_exe: Vec<DetectedGame> = Vec::new();

    for game in games {
        let key = normalize_path(&game.exe_path).to_ascii_lowercase();
        if let Some(existing) = by_exe.iter_mut().find(|candidate| {
            normalize_path(&candidate.exe_path).eq_ignore_ascii_case(&key)
        }) {
            if game.platform.rank() > existing.platform.rank() {
                *existing = game;
            }
            continue;
        }
        by_exe.push(game);
    }

    by_exe.sort_by(|left, right| left.name.to_ascii_lowercase().cmp(&right.name.to_ascii_lowercase()));
    by_exe
}

fn emit(
    on_progress: &mut impl FnMut(ScanProgress),
    phase: &str,
    message: &str,
    found: u32,
    saved: u32,
) {
    on_progress(ScanProgress {
        phase: phase.into(),
        message: message.into(),
        found,
        saved,
    });
}
