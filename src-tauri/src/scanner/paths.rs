use std::env;
use std::path::{Path, PathBuf};

pub fn program_files() -> Vec<PathBuf> {
    [
        env::var_os("ProgramFiles"),
        env::var_os("ProgramFiles(x86)"),
        env::var_os("ProgramW6432"),
    ]
    .into_iter()
    .flatten()
    .map(PathBuf::from)
    .filter(|path| path.exists())
    .collect()
}

pub fn program_data() -> Option<PathBuf> {
    env::var_os("ProgramData").map(PathBuf::from)
}

pub fn existing_join(root: impl AsRef<Path>, parts: &[&str]) -> Option<PathBuf> {
    let mut path = root.as_ref().to_path_buf();
    for part in parts {
        path.push(part);
    }
    path.exists().then_some(path)
}

pub fn default_steam_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    for program_files in program_files() {
        if let Some(path) = existing_join(&program_files, &["Steam"]) {
            roots.push(path);
        }
    }
    roots
}

pub fn default_epic_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    for program_files in program_files() {
        if let Some(path) = existing_join(&program_files, &["Epic Games"]) {
            roots.push(path);
        }
    }
    roots
}

pub fn default_gog_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    for program_files in program_files() {
        if let Some(path) = existing_join(&program_files, &["GOG Galaxy", "Games"]) {
            roots.push(path);
        }
        if let Some(path) = existing_join(&program_files, &["GOG Games"]) {
            roots.push(path);
        }
    }
    roots
}

pub fn default_xbox_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    roots.extend(
        ["C:\\XboxGames", "D:\\XboxGames", "E:\\XboxGames"]
            .into_iter()
            .map(PathBuf::from)
            .filter(|path| path.exists()),
    );
    for program_files in program_files() {
        if let Some(path) = existing_join(&program_files, &["ModifiableWindowsApps"]) {
            roots.push(path);
        }
    }
    roots
}

pub fn epic_manifest_dir() -> Option<PathBuf> {
    program_data().and_then(|root| {
        existing_join(
            root,
            &["Epic", "EpicGamesLauncher", "Data", "Manifests"],
        )
    })
}
