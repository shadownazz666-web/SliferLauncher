use crate::achievements;
use crate::cache;
use crate::db::Database;
use crate::discord::DiscordRpc;
use crate::http;
use crate::launch::{self, SessionTracker};
use crate::media;
use crate::models::{
    AchievementSummary, AchievementSyncResult, AchievementView, ArtworkCacheRequest,
    CreateLocalAccountRequest, DiscordConfig, DiscordPresencePayload, GamePreferences,
    LaunchResult, LibraryGame, LocalAccountPublic, LoginLocalAccountRequest, MediaItem,
    RemoteFetchRequest, ScanResult, SetupState, UserProfile,
};
use crate::profile;
use crate::scanner;
use crate::setup;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;

pub const SCAN_PROGRESS_EVENT: &str = "game-scan-progress";
pub const SCAN_COMPLETE_EVENT: &str = "game-scan-complete";

#[tauri::command]
pub fn list_library_games(db: State<'_, Database>) -> Result<Vec<crate::models::LibraryGame>, String> {
    let _ = scanner::purge_non_games(db.inner());
    db.list_games()
}

#[tauri::command]
pub async fn scan_for_installed_games(
    app: AppHandle,
    db: State<'_, Database>,
) -> Result<ScanResult, String> {
    let db = db.inner().clone();
    let app_for_scan = app.clone();

    let result = tauri::async_runtime::spawn_blocking(move || {
        scanner::scan_and_persist(&db, |progress| {
            let _ = app_for_scan.emit(SCAN_PROGRESS_EVENT, progress);
        })
    })
    .await
    .map_err(|error| format!("scan task failed: {error}"))?;

    let result = result?;
    let _ = app.emit(SCAN_COMPLETE_EVENT, &result);
    Ok(result)
}

#[tauri::command]
pub fn add_manual_game(
    app: AppHandle,
    db: State<'_, Database>,
) -> Result<Option<LibraryGame>, String> {
    let picked = app
        .dialog()
        .file()
        .set_title("Select a game executable")
        .add_filter("Game executable", &["exe"])
        .blocking_pick_file();
    let Some(file) = picked else {
        return Ok(None);
    };
    let exe_path = file
        .into_path()
        .map_err(|error| format!("resolve selected file: {error}"))?;
    Ok(Some(scanner::add_manual_game(
        db.inner(),
        &exe_path.to_string_lossy(),
    )?))
}

#[tauri::command]
pub async fn fetch_remote_text(request: RemoteFetchRequest) -> Result<String, String> {
    http::fetch_remote_text(request).await
}

#[tauri::command]
pub async fn cache_game_artwork(
    db: State<'_, Database>,
    request: ArtworkCacheRequest,
) -> Result<LibraryGame, String> {
    let db = db.inner().clone();
    cache::cache_game_artwork(&db, request).await
}

#[tauri::command]
pub async fn launch_game(
    app: AppHandle,
    db: State<'_, Database>,
    tracker: State<'_, SessionTracker>,
    game_id: String,
    profile_id: Option<String>,
    booster_enabled: Option<bool>,
) -> Result<LaunchResult, String> {
    let db = db.inner().clone();
    let tracker = tracker.inner().clone();
    launch::launch_game(
        app,
        db,
        tracker,
        game_id,
        profile_id,
        booster_enabled.unwrap_or(false),
    )
}

#[tauri::command]
pub fn update_game_preferences(
    db: State<'_, Database>,
    prefs: GamePreferences,
) -> Result<LibraryGame, String> {
    db.update_preferences(&prefs)
}

#[tauri::command]
pub fn list_running_games(tracker: State<'_, SessionTracker>) -> Vec<String> {
    tracker.running_ids()
}

#[tauri::command]
pub fn load_user_profile() -> Result<UserProfile, String> {
    profile::load_user_profile()
}

#[tauri::command]
pub fn save_user_profile(profile: UserProfile) -> Result<UserProfile, String> {
    profile::save_user_profile(profile)
}

#[tauri::command]
pub fn save_profile_asset(
    slot: String,
    filename: String,
    data: Vec<u8>,
) -> Result<String, String> {
    profile::save_profile_asset(&slot, &filename, &data)
}

#[tauri::command]
pub fn clear_profile_asset(slot: String) -> Result<(), String> {
    profile::clear_profile_asset(&slot)
}

#[tauri::command]
pub fn load_setup_state() -> Result<SetupState, String> {
    setup::load_setup_state()
}

#[tauri::command]
pub fn default_install_path() -> Result<String, String> {
    setup::default_install_path()
}

#[tauri::command]
pub fn save_setup_state(state: SetupState) -> Result<SetupState, String> {
    setup::save_setup_state(state)
}

#[tauri::command]
pub fn reset_setup_state() -> Result<SetupState, String> {
    setup::reset_setup_state()
}

#[tauri::command]
pub fn pick_install_directory(app: AppHandle) -> Result<Option<String>, String> {
    setup::pick_install_directory(&app)
}

#[tauri::command]
pub fn create_local_account(
    request: CreateLocalAccountRequest,
) -> Result<LocalAccountPublic, String> {
    setup::create_local_account(request)
}

#[tauri::command]
pub fn login_local_account(request: LoginLocalAccountRequest) -> Result<LocalAccountPublic, String> {
    setup::login_local_account(request)
}

#[tauri::command]
pub fn configure_discord_rpc(rpc: State<'_, DiscordRpc>, config: DiscordConfig) {
    rpc.configure(config.enabled, config.client_id);
}

#[tauri::command]
pub fn set_discord_presence(rpc: State<'_, DiscordRpc>, payload: DiscordPresencePayload) {
    rpc.set_payload(payload);
}

#[tauri::command]
pub fn clear_discord_presence(rpc: State<'_, DiscordRpc>) {
    rpc.clear();
}

#[tauri::command]
pub fn list_game_achievements(
    db: State<'_, Database>,
    game_id: String,
) -> Result<Vec<AchievementView>, String> {
    achievements::list_game_achievements(db.inner(), &game_id)
}

#[tauri::command]
pub async fn sync_game_achievements(
    db: State<'_, Database>,
    game_id: String,
) -> Result<AchievementSyncResult, String> {
    let db = db.inner().clone();
    achievements::sync_game_achievements(&db, &game_id).await
}

#[tauri::command]
pub fn set_achievement_unlocked(
    db: State<'_, Database>,
    game_id: String,
    api_name: String,
    unlocked: bool,
) -> Result<AchievementView, String> {
    achievements::set_unlocked(db.inner(), &game_id, &api_name, unlocked)
}

#[tauri::command]
pub fn get_achievement_summary(
    db: State<'_, Database>,
    game_id: String,
) -> Result<AchievementSummary, String> {
    achievements::summary(db.inner(), &game_id)
}

#[tauri::command]
pub fn list_game_media(game_id: String) -> Result<Vec<MediaItem>, String> {
    media::list_media(&game_id)
}

#[tauri::command]
pub fn capture_game_screenshot(game_id: String) -> Result<MediaItem, String> {
    media::capture_screenshot(&game_id)
}

#[tauri::command]
pub fn toggle_main_window_visible(app: AppHandle) -> Result<bool, String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window missing".to_string())?;
    let visible = window
        .is_visible()
        .map_err(|error| format!("window visible: {error}"))?;
    if visible {
        window
            .hide()
            .map_err(|error| format!("hide window: {error}"))?;
        Ok(false)
    } else {
        window
            .show()
            .map_err(|error| format!("show window: {error}"))?;
        window
            .set_focus()
            .map_err(|error| format!("focus window: {error}"))?;
        Ok(true)
    }
}

#[tauri::command]
pub fn restart_app(app: AppHandle) {
    app.restart();
}

#[tauri::command]
pub fn apply_window_effects(app: AppHandle, label: String) -> Result<(), String> {
    let window = app
        .get_webview_window(&label)
        .ok_or_else(|| format!("window {label} missing"))?;
    crate::apply_liquid_glass_pub(&window);
    Ok(())
}

#[tauri::command]
pub fn toggle_game_overlay(app: AppHandle) -> Result<bool, String> {
    crate::overlay::toggle_overlay(&app)
}

#[tauri::command]
pub fn hide_game_overlay(app: AppHandle) {
    crate::overlay::hide_overlay(&app);
}

#[tauri::command]
pub fn itad_save_config(
    app: AppHandle,
    state: State<'_, crate::itad::ItadState>,
    config: crate::models::ItadPublicConfig,
) -> Result<(), String> {
    crate::itad::save_config(app, state, config)
}

#[tauri::command]
pub fn itad_get_session(state: State<'_, crate::itad::ItadState>) -> crate::models::ItadSessionView {
    crate::itad::get_session(state)
}

#[tauri::command]
pub async fn itad_begin_oauth(
    app: AppHandle,
    state: State<'_, crate::itad::ItadState>,
    config: crate::models::ItadOAuthConfig,
) -> Result<(), String> {
    crate::itad::begin_oauth(app, state, config).await
}

#[tauri::command]
pub async fn itad_refresh_token(
    app: AppHandle,
    state: State<'_, crate::itad::ItadState>,
    config: crate::models::ItadOAuthConfig,
) -> Result<crate::models::ItadSessionView, String> {
    crate::itad::refresh_token(app, state, config).await
}

#[tauri::command]
pub fn itad_logout(
    app: AppHandle,
    state: State<'_, crate::itad::ItadState>,
) -> Result<(), String> {
    crate::itad::logout(app, state)
}
