use crate::models::{DetectedGame, Platform};
use crate::scanner::exe::find_primary_executable;
use crate::scanner::filters;
use crate::scanner::paths;
use serde::Deserialize;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct EpicManifest {
    display_name: Option<String>,
    install_location: Option<String>,
    launch_executable: Option<String>,
    app_name: Option<String>,
}

pub fn scan_epic_games() -> Vec<DetectedGame> {
    let mut games = Vec::new();
    games.extend(scan_manifests());
    games.extend(scan_default_roots(&games));
    games
}

fn scan_manifests() -> Vec<DetectedGame> {
    let Some(dir) = paths::epic_manifest_dir() else {
        return Vec::new();
    };

    let Ok(entries) = fs::read_dir(dir) else {
        return Vec::new();
    };

    let mut games = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("item") {
            continue;
        }
        let Ok(bytes) = fs::read(&path) else {
            continue;
        };
        let text = String::from_utf8_lossy(&bytes).trim_start_matches('\u{feff}').to_string();
        let Ok(manifest) = serde_json::from_str::<EpicManifest>(&text) else {
            continue;
        };

        let name = manifest
            .display_name
            .or(manifest.app_name)
            .unwrap_or_default();
        if name.is_empty() || filters::is_utility_name(&name) {
            continue;
        }

        let Some(install_dir) = manifest
            .install_location
            .map(PathBuf::from)
            .filter(|path| path.exists())
        else {
            continue;
        };

        let exe_path = manifest
            .launch_executable
            .as_deref()
            .map(|relative| install_dir.join(relative))
            .filter(|path| path.exists())
            .or_else(|| find_primary_executable(&install_dir, Some(&name)));

        let Some(exe_path) = exe_path else {
            continue;
        };

        games.push(DetectedGame {
            name,
            exe_path,
            install_dir,
            platform: Platform::Epic,
            collection_tag: None,
            steam_app_id: None,
        });
    }

    games
}

fn scan_default_roots(existing: &[DetectedGame]) -> Vec<DetectedGame> {
    let mut extras = Vec::new();
    for root in paths::default_epic_roots() {
        let Ok(entries) = fs::read_dir(root) else {
            continue;
        };
        for entry in entries.flatten() {
            let install_dir = entry.path();
            if !install_dir.is_dir() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            if filters::is_utility_name(&name) || filters::looks_like_launcher_folder(&name) {
                continue;
            }
            if existing.iter().any(|game| game.install_dir == install_dir) {
                continue;
            }
            let Some(exe_path) = find_primary_executable(&install_dir, Some(&name)) else {
                continue;
            };
            extras.push(DetectedGame {
                name,
                exe_path,
                install_dir,
                platform: Platform::Epic,
                collection_tag: None,
                steam_app_id: None,
            });
        }
    }
    extras
}
