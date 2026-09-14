use crate::models::{
    CreateLocalAccountRequest, LocalAccountPublic, LoginLocalAccountRequest, SetupState,
};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredAccount {
    id: String,
    username: String,
    salt: String,
    password_hash: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct AccountFile {
    accounts: Vec<StoredAccount>,
}

fn root_dir() -> Result<PathBuf, String> {
    let roaming = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|error| format!("resolve setup root: {error}"))?;
    let dir = PathBuf::from(roaming).join("SliferLauncher");
    fs::create_dir_all(&dir).map_err(|error| format!("create setup dir: {error}"))?;
    Ok(dir)
}

fn setup_path() -> Result<PathBuf, String> {
    Ok(root_dir()?.join("setup.json"))
}

fn accounts_path() -> Result<PathBuf, String> {
    Ok(root_dir()?.join("accounts.json"))
}

pub fn default_install_path() -> Result<String, String> {
    let local = std::env::var("LOCALAPPDATA")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|error| format!("resolve install path: {error}"))?;
    Ok(PathBuf::from(local)
        .join("Programs")
        .join("Slifer")
        .to_string_lossy()
        .replace('/', "\\"))
}

pub fn load_setup_state() -> Result<SetupState, String> {
    let path = setup_path()?;
    if !path.exists() {
        return Ok(SetupState::default());
    }
    let raw = fs::read_to_string(&path).map_err(|error| format!("read setup: {error}"))?;
    serde_json::from_str(&raw).map_err(|error| format!("parse setup: {error}"))
}

pub fn save_setup_state(state: SetupState) -> Result<SetupState, String> {
    let path = setup_path()?;
    let raw = serde_json::to_string_pretty(&state)
        .map_err(|error| format!("serialize setup: {error}"))?;
    fs::write(&path, raw).map_err(|error| format!("write setup: {error}"))?;
    Ok(state)
}

pub fn reset_setup_state() -> Result<SetupState, String> {
    save_setup_state(SetupState::default())
}

fn load_accounts() -> Result<AccountFile, String> {
    let path = accounts_path()?;
    if !path.exists() {
        return Ok(AccountFile::default());
    }
    let raw = fs::read_to_string(&path).map_err(|error| format!("read accounts: {error}"))?;
    serde_json::from_str(&raw).map_err(|error| format!("parse accounts: {error}"))
}

fn save_accounts(file: &AccountFile) -> Result<(), String> {
    let path = accounts_path()?;
    let raw = serde_json::to_string_pretty(file)
        .map_err(|error| format!("serialize accounts: {error}"))?;
    fs::write(&path, raw).map_err(|error| format!("write accounts: {error}"))
}

fn hash_password(salt: &str, password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(salt.as_bytes());
    hasher.update(b":");
    hasher.update(password.as_bytes());
    hex::encode(hasher.finalize())
}

fn make_salt() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_nanos())
        .unwrap_or(0);
    hex::encode(Sha256::digest(format!("slifer-{nanos}").as_bytes()))[..32].to_string()
}

fn normalize_username(username: &str) -> Result<String, String> {
    let trimmed = username.trim();
    let char_count = trimmed.chars().count();
    if char_count < 2 || char_count > 32 {
        return Err("Username must be 2–32 characters".into());
    }
    // Allow letters from any language, numbers, underscore, hyphen, and spaces.
    if !trimmed.chars().all(|ch| {
        ch.is_alphanumeric() || ch == '_' || ch == '-' || ch == ' ' || ch == '.'
    }) {
        return Err("Username may use letters (any language), numbers, spaces, . _ and -".into());
    }
    if trimmed.chars().all(|ch| ch.is_whitespace()) {
        return Err("Username cannot be only spaces".into());
    }
    Ok(trimmed.to_string())
}

fn validate_password(password: &str) -> Result<(), String> {
    if password.len() < 6 {
        return Err("Password must be at least 6 characters".into());
    }
    Ok(())
}

pub fn create_local_account(
    request: CreateLocalAccountRequest,
) -> Result<LocalAccountPublic, String> {
    let username = normalize_username(&request.username)?;
    validate_password(&request.password)?;

    let mut file = load_accounts()?;
    if file
        .accounts
        .iter()
        .any(|account| account.username.eq_ignore_ascii_case(&username))
    {
        return Err("That username is already taken".into());
    }

    let salt = make_salt();
    let password_hash = hash_password(&salt, &request.password);
    let id = hex::encode(Sha256::digest(
        format!("{username}-{salt}").as_bytes(),
    ))[..16]
        .to_string();

    file.accounts.push(StoredAccount {
        id: id.clone(),
        username: username.clone(),
        salt,
        password_hash,
    });
    save_accounts(&file)?;

    let mut setup = load_setup_state()?;
    setup.account_id = Some(id.clone());
    setup.setup_complete = true;
    save_setup_state(setup)?;

    Ok(LocalAccountPublic { id, username })
}

pub fn login_local_account(
    request: LoginLocalAccountRequest,
) -> Result<LocalAccountPublic, String> {
    let username = normalize_username(&request.username)?;
    validate_password(&request.password)?;

    let file = load_accounts()?;
    let account = file
        .accounts
        .iter()
        .find(|account| account.username.eq_ignore_ascii_case(&username))
        .ok_or_else(|| "Invalid username or password".to_string())?;

    let candidate = hash_password(&account.salt, &request.password);
    if candidate != account.password_hash {
        return Err("Invalid username or password".into());
    }

    let mut setup = load_setup_state()?;
    setup.account_id = Some(account.id.clone());
    setup.setup_complete = true;
    save_setup_state(setup)?;

    Ok(LocalAccountPublic {
        id: account.id.clone(),
        username: account.username.clone(),
    })
}

pub fn pick_install_directory(app: &tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let picked = app
        .dialog()
        .file()
        .set_title("Choose install location")
        .blocking_pick_folder();

    match picked {
        Some(folder) => {
            let path = folder
                .into_path()
                .map_err(|error| format!("resolve folder: {error}"))?;
            Ok(Some(path.to_string_lossy().replace('/', "\\")))
        }
        None => Ok(None),
    }
}
