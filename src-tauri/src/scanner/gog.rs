use crate::models::{DetectedGame, Platform};
use crate::scanner::exe::find_primary_executable;
use crate::scanner::filters;
use crate::scanner::paths;
use std::fs;
use std::path::{Path, PathBuf};

#[cfg(windows)]
use winreg::enums::{HKEY_LOCAL_MACHINE, KEY_READ};
#[cfg(windows)]
use winreg::RegKey;

const GOG_REGISTRY_PATHS: &[&str] = &[
    r"SOFTWARE\WOW6432Node\GOG.com\Games",
    r"SOFTWARE\GOG.com\Games",
];

pub fn scan_gog_games() -> Vec<DetectedGame> {
    let mut games = scan_gog_registry();
    games.extend(scan_gog_folders(&games));
    games
}

fn scan_gog_registry() -> Vec<DetectedGame> {
    #[cfg(windows)]
    {
        let mut games = Vec::new();
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        for path in GOG_REGISTRY_PATHS {
            let Ok(root) = hklm.open_subkey_with_flags(path, KEY_READ) else {
                continue;
            };
            for key_name in root.enum_keys().flatten() {
                let Ok(entry) = root.open_subkey_with_flags(&key_name, KEY_READ) else {
                    continue;
                };
                if let Some(game) = parse_gog_entry(&entry) {
                    games.push(game);
                }
            }
        }
        games
    }

    #[cfg(not(windows))]
    {
        Vec::new()
    }
}

#[cfg(windows)]
fn parse_gog_entry(entry: &RegKey) -> Option<DetectedGame> {
    let name: String = entry
        .get_value("gameName")
        .or_else(|_| entry.get_value("GAMENAME"))
        .ok()?;
    if filters::is_utility_name(&name) {
        return None;
    }

    let install_dir = entry
        .get_value::<String, _>("path")
        .or_else(|_| entry.get_value("PATH"))
        .ok()
        .map(PathBuf::from)
        .filter(|path| path.exists())?;

    let exe_path = entry
        .get_value::<String, _>("exe")
        .or_else(|_| entry.get_value("EXE"))
        .ok()
        .map(PathBuf::from)
        .filter(|path| path.exists())
        .or_else(|| find_primary_executable(&install_dir, Some(&name)))?;

    Some(DetectedGame {
        name,
        exe_path,
        install_dir,
        platform: Platform::GOG,
        collection_tag: None,
        steam_app_id: None,
    })
}

fn scan_gog_folders(existing: &[DetectedGame]) -> Vec<DetectedGame> {
    let mut extras = Vec::new();
    for root in paths::default_gog_roots() {
        extras.extend(scan_game_folders(&root, existing));
    }
    extras
}

fn scan_game_folders(root: &Path, existing: &[DetectedGame]) -> Vec<DetectedGame> {
    let Ok(entries) = fs::read_dir(root) else {
        return Vec::new();
    };

    let mut games = Vec::new();
    for entry in entries.flatten() {
        let install_dir = entry.path();
        if !install_dir.is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if filters::is_utility_name(&name) {
            continue;
        }
        if existing
            .iter()
            .any(|game| game.install_dir == install_dir)
        {
            continue;
        }
        let Some(exe_path) = find_primary_executable(&install_dir, Some(&name)) else {
            continue;
        };
        games.push(DetectedGame {
            name,
            exe_path,
            install_dir,
            platform: Platform::GOG,
            collection_tag: None,
            steam_app_id: None,
        });
    }
    games
}
