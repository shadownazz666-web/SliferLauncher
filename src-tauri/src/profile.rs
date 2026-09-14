use crate::models::UserProfile;
use std::fs;
use std::path::{Path, PathBuf};

const MAX_ASSET_BYTES: usize = 32 * 1024 * 1024;
const ALLOWED_EXTENSIONS: &[&str] = &["gif", "png", "jpg", "jpeg", "webp", "mp4", "webm"];

pub fn profile_dir() -> Result<PathBuf, String> {
    let roaming = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|error| format!("resolve profile root: {error}"))?;
    let dir = PathBuf::from(roaming)
        .join("SliferLauncher")
        .join("Profile");
    fs::create_dir_all(&dir).map_err(|error| format!("create profile dir: {error}"))?;
    Ok(dir)
}

fn profile_json_path() -> Result<PathBuf, String> {
    Ok(profile_dir()?.join("profile.json"))
}

pub fn load_user_profile() -> Result<UserProfile, String> {
    let path = profile_json_path()?;
    if !path.exists() {
        return Ok(UserProfile::default());
    }
    let raw = fs::read_to_string(&path).map_err(|error| format!("read profile: {error}"))?;
    serde_json::from_str(&raw).map_err(|error| format!("parse profile: {error}"))
}

pub fn save_user_profile(profile: UserProfile) -> Result<UserProfile, String> {
    let path = profile_json_path()?;
    let raw = serde_json::to_string_pretty(&profile)
        .map_err(|error| format!("serialize profile: {error}"))?;
    fs::write(&path, raw).map_err(|error| format!("write profile: {error}"))?;
    Ok(profile)
}

pub fn save_profile_asset(slot: &str, filename: &str, data: &[u8]) -> Result<String, String> {
    let slot = normalize_slot(slot)?;
    if data.is_empty() {
        return Err("empty asset".into());
    }
    if data.len() > MAX_ASSET_BYTES {
        return Err("asset exceeds 32 MB".into());
    }

    let extension = extension_of(filename)?;
    let dir = profile_dir()?;
    remove_slot_files(&dir, slot)?;

    let path = dir.join(format!("{slot}.{extension}"));
    fs::write(&path, data).map_err(|error| format!("write {slot}: {error}"))?;
    Ok(path.to_string_lossy().replace('/', "\\"))
}

pub fn clear_profile_asset(slot: &str) -> Result<(), String> {
    let slot = normalize_slot(slot)?;
    let dir = profile_dir()?;
    remove_slot_files(&dir, slot)
}

fn normalize_slot(slot: &str) -> Result<&'static str, String> {
    match slot {
        "avatar" => Ok("avatar"),
        "banner" => Ok("banner"),
        "background" => Ok("background"),
        _ => Err("unknown profile asset slot".into()),
    }
}

fn extension_of(filename: &str) -> Result<&'static str, String> {
    let ext = Path::new(filename)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    ALLOWED_EXTENSIONS
        .iter()
        .copied()
        .find(|allowed| *allowed == ext)
        .ok_or_else(|| format!("unsupported asset type: {ext}"))
}

fn remove_slot_files(dir: &Path, slot: &str) -> Result<(), String> {
    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return Ok(()),
    };
    for entry in entries.flatten() {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name
            .strip_prefix(slot)
            .is_some_and(|rest| rest.starts_with('.'))
        {
            let _ = fs::remove_file(entry.path());
        }
    }
    Ok(())
}
