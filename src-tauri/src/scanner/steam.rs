use crate::models::{DetectedGame, Platform};
use crate::scanner::exe::find_primary_executable;
use crate::scanner::filters;
use crate::scanner::paths;
use std::fs;
use std::path::{Path, PathBuf};

#[cfg(windows)]
use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ};
#[cfg(windows)]
use winreg::RegKey;

pub fn scan_steam_libraries() -> Vec<DetectedGame> {
    let mut games = Vec::new();
    for steam_root in steam_roots() {
        for library in steam_libraries(&steam_root) {
            games.extend(scan_library(&library));
        }
    }
    games
}

pub fn install_roots() -> Vec<PathBuf> {
    steam_roots()
}

fn steam_roots() -> Vec<PathBuf> {
    let mut roots = paths::default_steam_roots();
    roots.extend(steam_roots_from_registry());
    roots.sort();
    roots.dedup();
    roots
}

fn steam_roots_from_registry() -> Vec<PathBuf> {
    #[cfg(windows)]
    {
        let mut roots = Vec::new();
        if let Ok(key) = RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey_with_flags(r"Software\Valve\Steam", KEY_READ)
        {
            if let Ok(path) = key.get_value::<String, _>("SteamPath") {
                let path = PathBuf::from(path.replace('/', "\\"));
                if path.exists() {
                    roots.push(path);
                }
            }
        }

        if let Ok(key) = RegKey::predef(HKEY_LOCAL_MACHINE)
            .open_subkey_with_flags(r"SOFTWARE\WOW6432Node\Valve\Steam", KEY_READ)
        {
            if let Ok(path) = key.get_value::<String, _>("InstallPath") {
                let path = PathBuf::from(path);
                if path.exists() {
                    roots.push(path);
                }
            }
        }
        roots
    }

    #[cfg(not(windows))]
    {
        Vec::new()
    }
}

fn steam_libraries(steam_root: &Path) -> Vec<PathBuf> {
    let mut libraries = vec![steam_root.to_path_buf()];
    for relative in ["steamapps\\libraryfolders.vdf", "config\\libraryfolders.vdf"] {
        let file = steam_root.join(relative);
        if let Ok(text) = fs::read_to_string(file) {
            for value in vdf_values(&text, "path") {
                let path = PathBuf::from(value.replace("\\\\", "\\"));
                if path.exists() {
                    libraries.push(path);
                }
            }
        }
    }
    libraries.sort();
    libraries.dedup();
    libraries
}

fn scan_library(library_root: &Path) -> Vec<DetectedGame> {
    let steamapps = library_root.join("steamapps");
    let common = steamapps.join("common");
    if !common.exists() {
        return Vec::new();
    }

    let mut games = Vec::new();
    let mut claimed_dirs = Vec::new();

    if let Ok(entries) = fs::read_dir(&steamapps) {
        for entry in entries.flatten() {
            let path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string();
            if !file_name.starts_with("appmanifest_") || !file_name.ends_with(".acf") {
                continue;
            }
            let Ok(text) = fs::read_to_string(&path) else {
                continue;
            };
            let Some(name) = vdf_first(&text, "name") else {
                continue;
            };
            if filters::is_utility_name(&name) {
                continue;
            }
            let Some(installdir) = vdf_first(&text, "installdir") else {
                continue;
            };
            let install_dir = common.join(&installdir);
            if !install_dir.exists() {
                continue;
            }
            let Some(exe_path) = find_primary_executable(&install_dir, Some(&name)) else {
                continue;
            };
            claimed_dirs.push(install_dir.clone());
            games.push(DetectedGame {
                name,
                exe_path,
                install_dir,
                platform: Platform::Steam,
                collection_tag: None,
                steam_app_id: parse_app_id(&file_name, &text),
            });
        }
    }

    if let Ok(entries) = fs::read_dir(&common) {
        for entry in entries.flatten() {
            let install_dir = entry.path();
            if !install_dir.is_dir() {
                continue;
            }
            let folder_name = entry.file_name().to_string_lossy().to_string();
            if filters::is_utility_name(&folder_name) || filters::looks_like_launcher_folder(&folder_name)
            {
                continue;
            }
            if claimed_dirs.iter().any(|claimed| claimed == &install_dir) {
                continue;
            }
            let Some(exe_path) = find_primary_executable(&install_dir, Some(&folder_name)) else {
                continue;
            };
            games.push(DetectedGame {
                name: folder_name,
                exe_path,
                install_dir,
                platform: Platform::Steam,
                collection_tag: None,
                steam_app_id: None,
            });
        }
    }

    games
}

fn parse_app_id(file_name: &str, text: &str) -> Option<i64> {
    if let Some(app_id) = vdf_first(text, "appid").and_then(|value| value.parse().ok()) {
        return Some(app_id);
    }
    file_name
        .strip_prefix("appmanifest_")
        .and_then(|rest| rest.strip_suffix(".acf"))
        .and_then(|value| value.parse().ok())
}

fn vdf_first(text: &str, key: &str) -> Option<String> {
    vdf_values(text, key).into_iter().next()
}

fn vdf_values(text: &str, key: &str) -> Vec<String> {
    let needle = format!("\"{key}\"");
    let mut values = Vec::new();
    let mut rest = text;

    while let Some(index) = rest.find(&needle) {
        rest = &rest[index + needle.len()..];
        let trimmed = rest.trim_start();
        if !trimmed.starts_with('"') {
            continue;
        }
        if let Some(end) = trimmed[1..].find('"') {
            values.push(trimmed[1..=end].to_string());
            rest = &trimmed[end + 2..];
        } else {
            break;
        }
    }

    values
}
