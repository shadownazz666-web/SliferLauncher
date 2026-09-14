use crate::models::{DetectedGame, Platform};
use crate::scanner::exe::{clean_icon_path, find_primary_executable};
use crate::scanner::filters;
use std::collections::HashSet;
use std::path::PathBuf;

#[cfg(windows)]
use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ};
#[cfg(windows)]
use winreg::RegKey;

const UNINSTALL_PATHS: &[&str] = &[
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
    r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
];

pub fn scan_uninstall_registry() -> Vec<DetectedGame> {
    #[cfg(windows)]
    {
        let mut games = Vec::new();
        let mut seen_keys = HashSet::new();
        let mut seen_installs = HashSet::new();

        collect_hive(HKEY_LOCAL_MACHINE, &mut games, &mut seen_keys, &mut seen_installs);
        collect_hive(HKEY_CURRENT_USER, &mut games, &mut seen_keys, &mut seen_installs);
        games
    }

    #[cfg(not(windows))]
    {
        Vec::new()
    }
}

#[cfg(windows)]
fn collect_hive(
    hive: winreg::HKEY,
    games: &mut Vec<DetectedGame>,
    seen_keys: &mut HashSet<String>,
    seen_installs: &mut HashSet<String>,
) {
    let root = RegKey::predef(hive);
    for uninstall_path in UNINSTALL_PATHS {
        let Ok(uninstall) = root.open_subkey_with_flags(uninstall_path, KEY_READ) else {
            continue;
        };

        for key_name in uninstall.enum_keys().flatten() {
            let dedupe_key = format!("{uninstall_path}\\{key_name}").to_ascii_lowercase();
            if !seen_keys.insert(dedupe_key) {
                continue;
            }

            let Ok(entry) = uninstall.open_subkey_with_flags(&key_name, KEY_READ) else {
                continue;
            };

            if let Some(game) = parse_uninstall_entry(&entry, &key_name, seen_installs) {
                games.push(game);
            }
        }
    }
}

#[cfg(windows)]
fn parse_uninstall_entry(
    entry: &RegKey,
    key_name: &str,
    seen_installs: &mut HashSet<String>,
) -> Option<DetectedGame> {
    let system_component: u32 = entry.get_value("SystemComponent").unwrap_or(0);
    if system_component == 1 {
        return None;
    }

    let parent_key: String = entry.get_value("ParentKeyName").unwrap_or_default();
    if !parent_key.is_empty() {
        return None;
    }

    let name: String = entry.get_value("DisplayName").ok()?;
    if name.trim().is_empty() || filters::is_utility_name(&name) {
        return None;
    }

    let publisher: String = entry.get_value("Publisher").unwrap_or_default();
    if filters::is_utility_publisher(&publisher) {
        return None;
    }

    let steam_app_id = filters::steam_app_id_from_uninstall_key(key_name);
    let steam_uninstall = filters::is_steam_uninstall_key(key_name);

    let install_dir = entry
        .get_value::<String, _>("InstallLocation")
        .ok()
        .map(PathBuf::from)
        .filter(|path| path.exists());

    let display_icon = entry
        .get_value::<String, _>("DisplayIcon")
        .ok()
        .and_then(|value| clean_icon_path(&value));

    let Some(install_dir) = install_dir.or_else(|| display_icon.as_ref().and_then(|exe| exe.parent().map(PathBuf::from))) else {
        return None;
    };

    if filters::is_system_install_dir(&install_dir) {
        return None;
    }

    if !steam_uninstall && !filters::is_game_library_path(&install_dir) {
        return None;
    }

    let install_key = crate::db::normalize_path(&install_dir).to_ascii_lowercase();
    if !seen_installs.insert(install_key) {
        return None;
    }

    let platform = infer_platform(&install_dir);

    let exe_path = display_icon
        .filter(|path| path.exists() && !filters::is_excluded_exe(path))
        .or_else(|| find_primary_executable(&install_dir, Some(&name)))?;

    Some(DetectedGame {
        name: clean_display_name(&name),
        exe_path,
        install_dir,
        platform,
        collection_tag: None,
        steam_app_id,
    })
}

fn infer_platform(install_dir: &std::path::Path) -> Platform {
    let value = install_dir.to_string_lossy().to_ascii_lowercase();
    if value.contains("\\steamapps\\common\\") {
        Platform::Steam
    } else if value.contains("\\epic games\\") {
        Platform::Epic
    } else if value.contains("\\gog galaxy\\") || value.contains("\\gog games\\") {
        Platform::GOG
    } else {
        Platform::Custom
    }
}

fn clean_display_name(name: &str) -> String {
    name.replace("™", "")
        .replace("®", "")
        .replace("©", "")
        .trim()
        .to_string()
}
