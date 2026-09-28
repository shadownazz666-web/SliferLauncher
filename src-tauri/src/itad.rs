use crate::models::{ItadOAuthConfig, ItadPublicConfig, ItadSessionView};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_opener::OpenerExt;

const REDIRECT_URI: &str = "mylauncher://auth";
const AUTHORIZE_URL: &str = "https://isthereanydeal.com/oauth/authorize/";
const TOKEN_URL: &str = "https://isthereanydeal.com/oauth/token/";
const AUTH_EVENT: &str = "itad-auth-changed";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct StoredConfig {
    api_key: String,
    client_id: String,
    client_secret: String,
    country: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct StoredTokens {
    access_token: String,
    refresh_token: String,
    expires_at: i64,
    username: Option<String>,
}

#[derive(Debug, Clone)]
struct PendingAuth {
    state: String,
    code_verifier: String,
    client_id: String,
    client_secret: String,
}

pub struct ItadState {
    inner: Mutex<ItadInner>,
}

#[derive(Default)]
struct ItadInner {
    config: StoredConfig,
    tokens: Option<StoredTokens>,
    pending: Option<PendingAuth>,
}

impl ItadState {
    pub fn load(app: &AppHandle) -> Self {
        let mut inner = ItadInner::default();
        if let Ok(config) = read_json::<StoredConfig>(&config_path(app)) {
            inner.config = config;
        }
        if let Ok(bytes) = std::fs::read(tokens_path(app)) {
            if let Ok(plain) = unprotect(&bytes) {
                if let Ok(tokens) = serde_json::from_slice::<StoredTokens>(&plain) {
                    inner.tokens = Some(tokens);
                }
            }
        }
        Self {
            inner: Mutex::new(inner),
        }
    }
}

fn app_data(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("app data dir: {error}"))?;
    std::fs::create_dir_all(&dir).map_err(|error| format!("create app data: {error}"))?;
    Ok(dir)
}

fn config_path(app: &AppHandle) -> PathBuf {
    app_data(app)
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("itad.config.json")
}

fn tokens_path(app: &AppHandle) -> PathBuf {
    app_data(app)
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("itad.tokens.bin")
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &Path) -> Result<T, String> {
    let raw = std::fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&raw).map_err(|error| error.to_string())
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let raw = serde_json::to_string_pretty(value).map_err(|error| error.to_string())?;
    std::fs::write(path, raw).map_err(|error| error.to_string())
}

fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn random_url_safe(bytes_len: usize) -> String {
    let mut bytes = vec![0u8; bytes_len];
    rand::thread_rng().fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

fn pkce_challenge(verifier: &str) -> String {
    let digest = Sha256::digest(verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(digest)
}

fn session_view(inner: &ItadInner) -> ItadSessionView {
    match &inner.tokens {
        Some(tokens) if !tokens.access_token.is_empty() => ItadSessionView {
            connected: true,
            access_token: Some(tokens.access_token.clone()),
            expires_at: Some(tokens.expires_at),
            username: tokens.username.clone(),
        },
        _ => ItadSessionView {
            connected: false,
            access_token: None,
            expires_at: None,
            username: None,
        },
    }
}

fn emit_session(app: &AppHandle, state: &ItadState) {
    if let Ok(guard) = state.inner.lock() {
        let _ = app.emit(AUTH_EVENT, session_view(&guard));
    }
}

#[cfg(windows)]
fn protect(plain: &[u8]) -> Result<Vec<u8>, String> {
    use windows_sys::Win32::Foundation::{LocalFree, BOOL};
    use windows_sys::Win32::Security::Cryptography::{CryptProtectData, CRYPT_INTEGER_BLOB};

    let mut data_in = CRYPT_INTEGER_BLOB {
        cbData: plain.len() as u32,
        pbData: plain.as_ptr() as *mut u8,
    };
    let mut data_out = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };
    let ok: BOOL = unsafe {
        CryptProtectData(
            &mut data_in,
            std::ptr::null(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            0,
            &mut data_out,
        )
    };
    if ok == 0 {
        return Err("DPAPI CryptProtectData failed".into());
    }
    let slice = unsafe { std::slice::from_raw_parts(data_out.pbData, data_out.cbData as usize) };
    let out = slice.to_vec();
    unsafe {
        let _ = LocalFree(data_out.pbData as _);
    }
    Ok(out)
}

#[cfg(windows)]
fn unprotect(blob: &[u8]) -> Result<Vec<u8>, String> {
    use windows_sys::Win32::Foundation::{LocalFree, BOOL};
    use windows_sys::Win32::Security::Cryptography::{CryptUnprotectData, CRYPT_INTEGER_BLOB};

    let mut data_in = CRYPT_INTEGER_BLOB {
        cbData: blob.len() as u32,
        pbData: blob.as_ptr() as *mut u8,
    };
    let mut data_out = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };
    let ok: BOOL = unsafe {
        CryptUnprotectData(
            &mut data_in,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            0,
            &mut data_out,
        )
    };
    if ok == 0 {
        return Err("DPAPI CryptUnprotectData failed".into());
    }
    let slice = unsafe { std::slice::from_raw_parts(data_out.pbData, data_out.cbData as usize) };
    let out = slice.to_vec();
    unsafe {
        let _ = LocalFree(data_out.pbData as _);
    }
    Ok(out)
}

#[cfg(not(windows))]
fn protect(plain: &[u8]) -> Result<Vec<u8>, String> {
    Ok(plain.to_vec())
}

#[cfg(not(windows))]
fn unprotect(blob: &[u8]) -> Result<Vec<u8>, String> {
    Ok(blob.to_vec())
}

fn persist_tokens(app: &AppHandle, tokens: &StoredTokens) -> Result<(), String> {
    let plain = serde_json::to_vec(tokens).map_err(|error| error.to_string())?;
    let sealed = protect(&plain)?;
    std::fs::write(tokens_path(app), sealed).map_err(|error| error.to_string())
}

fn clear_tokens_file(app: &AppHandle) {
    let _ = std::fs::remove_file(tokens_path(app));
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: Option<i64>,
}

async fn exchange_token(form: &[(String, String)]) -> Result<TokenResponse, String> {
    let client = reqwest::Client::new();
    let response = client
        .post(TOKEN_URL)
        .header("Accept", "application/json")
        .form(form)
        .send()
        .await
        .map_err(|error| format!("token request failed: {error}"))?;
    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| format!("token body: {error}"))?;
    if !status.is_success() {
        return Err(format!("token exchange {status}: {body}"));
    }
    serde_json::from_str(&body).map_err(|error| format!("token parse: {error} / {body}"))
}

pub fn save_config(
    app: AppHandle,
    state: State<'_, ItadState>,
    config: ItadPublicConfig,
) -> Result<(), String> {
    let stored = StoredConfig {
        api_key: config.api_key,
        client_id: config.client_id,
        client_secret: config.client_secret,
        country: config.country,
    };
    write_json(&config_path(&app), &stored)?;
    if let Ok(mut guard) = state.inner.lock() {
        guard.config = stored;
    }
    Ok(())
}

pub fn get_session(state: State<'_, ItadState>) -> ItadSessionView {
    state
        .inner
        .lock()
        .map(|guard| session_view(&guard))
        .unwrap_or(ItadSessionView {
            connected: false,
            access_token: None,
            expires_at: None,
            username: None,
        })
}

pub async fn begin_oauth(
    app: AppHandle,
    state: State<'_, ItadState>,
    config: ItadOAuthConfig,
) -> Result<(), String> {
    let client_id = config.client_id.trim().to_string();
    if client_id.is_empty() {
        return Err("ITAD client ID is required".into());
    }
    let state_value = random_url_safe(24);
    let verifier = random_url_safe(48);
    let challenge = pkce_challenge(&verifier);
    let scopes = if config.scopes.trim().is_empty() {
        "user_info wait_read wait_write coll_read coll_write".to_string()
    } else {
        config.scopes
    };
    let redirect = if config.redirect_uri.trim().is_empty() {
        REDIRECT_URI.to_string()
    } else {
        config.redirect_uri
    };

    {
        let mut guard = state.inner.lock().map_err(|_| "itad lock poisoned")?;
        guard.pending = Some(PendingAuth {
            state: state_value.clone(),
            code_verifier: verifier,
            client_id: client_id.clone(),
            client_secret: config.client_secret,
        });
        guard.config.client_id = client_id.clone();
    }

    let mut url = url::Url::parse(AUTHORIZE_URL).map_err(|error| error.to_string())?;
    {
        let mut query = url.query_pairs_mut();
        query.append_pair("response_type", "code");
        query.append_pair("client_id", &client_id);
        query.append_pair("redirect_uri", &redirect);
        query.append_pair("scope", &scopes);
        query.append_pair("state", &state_value);
        query.append_pair("code_challenge", &challenge);
        query.append_pair("code_challenge_method", "S256");
    }

    app.opener()
        .open_url(url.as_str(), None::<&str>)
        .map_err(|error| format!("open browser: {error}"))?;
    Ok(())
}

pub async fn handle_deep_link(app: AppHandle, state: &ItadState, raw_url: &str) -> Result<(), String> {
    let parsed = url::Url::parse(raw_url).map_err(|error| error.to_string())?;
    if parsed.scheme() != "mylauncher" {
        return Ok(());
    }
    let code = parsed
        .query_pairs()
        .find(|(key, _)| key == "code")
        .map(|(_, value)| value.to_string());
    let returned_state = parsed
        .query_pairs()
        .find(|(key, _)| key == "state")
        .map(|(_, value)| value.to_string());
    let (Some(code), Some(returned_state)) = (code, returned_state) else {
        return Err("OAuth callback missing code or state".into());
    };

    let pending = {
        let mut guard = state.inner.lock().map_err(|_| "itad lock poisoned")?;
        guard.pending.take()
    };
    let Some(pending) = pending else {
        return Err("No pending ITAD login".into());
    };
    if pending.state != returned_state {
        return Err("OAuth state mismatch — login cancelled for safety".into());
    }

    let mut form: Vec<(String, String)> = vec![
        ("grant_type".into(), "authorization_code".into()),
        ("client_id".into(), pending.client_id.clone()),
        ("redirect_uri".into(), REDIRECT_URI.into()),
        ("code".into(), code),
        ("code_verifier".into(), pending.code_verifier.clone()),
    ];
    if !pending.client_secret.trim().is_empty() {
        form.push(("client_secret".into(), pending.client_secret.clone()));
    }

    let token = exchange_token(&form).await?;
    let stored = StoredTokens {
        access_token: token.access_token,
        refresh_token: token.refresh_token.unwrap_or_default(),
        expires_at: unix_now() + token.expires_in.unwrap_or(3600),
        username: None,
    };
    persist_tokens(&app, &stored)?;
    if let Ok(mut guard) = state.inner.lock() {
        guard.tokens = Some(stored);
    }
    emit_session(&app, state);
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
    Ok(())
}

pub async fn refresh_token(
    app: AppHandle,
    state: State<'_, ItadState>,
    config: ItadOAuthConfig,
) -> Result<ItadSessionView, String> {
    let (refresh, client_id, client_secret, username) = {
        let guard = state.inner.lock().map_err(|_| "itad lock poisoned")?;
        let tokens = guard
            .tokens
            .clone()
            .ok_or_else(|| "Not signed in to ITAD".to_string())?;
        if tokens.refresh_token.is_empty() {
            return Err("Missing refresh token — connect ITAD again".into());
        }
        let client_id = if config.client_id.trim().is_empty() {
            guard.config.client_id.clone()
        } else {
            config.client_id
        };
        let client_secret = if config.client_secret.trim().is_empty() {
            guard.config.client_secret.clone()
        } else {
            config.client_secret
        };
        (
            tokens.refresh_token,
            client_id,
            client_secret,
            tokens.username,
        )
    };

    let mut form: Vec<(String, String)> = vec![
        ("grant_type".into(), "refresh_token".into()),
        ("refresh_token".into(), refresh.clone()),
        ("client_id".into(), client_id),
    ];
    if !client_secret.trim().is_empty() {
        form.push(("client_secret".into(), client_secret));
    }

    let token = exchange_token(&form).await?;
    let stored = StoredTokens {
        access_token: token.access_token,
        refresh_token: token.refresh_token.unwrap_or(refresh),
        expires_at: unix_now() + token.expires_in.unwrap_or(3600),
        username,
    };
    persist_tokens(&app, &stored)?;
    if let Ok(mut guard) = state.inner.lock() {
        guard.tokens = Some(stored);
    }
    emit_session(&app, state.inner());
    Ok(get_session(state))
}

pub fn logout(app: AppHandle, state: State<'_, ItadState>) -> Result<(), String> {
    if let Ok(mut guard) = state.inner.lock() {
        guard.tokens = None;
        guard.pending = None;
    }
    clear_tokens_file(&app);
    emit_session(&app, state.inner());
    Ok(())
}
