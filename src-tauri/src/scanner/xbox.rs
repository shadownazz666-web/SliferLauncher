use crate::models::{DetectedGame, Platform};
use crate::scanner::exe::find_primary_executable;
use crate::scanner::filters;
use crate::scanner::paths;
use std::fs;

pub fn scan_xbox_games() -> Vec<DetectedGame> {
    let mut games = Vec::new();
    for root in paths::default_xbox_roots() {
        let Ok(entries) = fs::read_dir(&root) else {
            continue;
        };

        for entry in entries.flatten() {
            let mut install_dir = entry.path();
            if !install_dir.is_dir() {
                continue;
            }

            let name = entry.file_name().to_string_lossy().to_string();
            if filters::is_utility_name(&name) || name.eq_ignore_ascii_case("GameSave") {
                continue;
            }

            let content = install_dir.join("Content");
            if content.is_dir() {
                install_dir = content;
            }

            let Some(exe_path) = find_primary_executable(&install_dir, Some(&name)) else {
                continue;
            };

            games.push(DetectedGame {
                name,
                exe_path,
                install_dir,
                platform: Platform::Custom,
                collection_tag: Some("Xbox".into()),
                steam_app_id: None,
            });
        }
    }

    games
}
