mod cache;
mod commands;
mod db;
mod discord;
mod booster;
mod achievements;
mod media;
mod http;
mod launch;
mod models;
mod overlay;
mod profile;
mod scanner;
mod setup;

use db::Database;
use tauri::{
    Manager,
    window::{Effect, EffectsBuilder},
};

const WINDOW_EFFECTS: [Effect; 4] = [
    Effect::MicaDark,
    Effect::Mica,
    Effect::Acrylic,
    Effect::Blur,
];

pub fn apply_liquid_glass_pub(window: &tauri::WebviewWindow) {
    apply_liquid_glass(window);
}

fn apply_liquid_glass(window: &tauri::WebviewWindow) {
    for effect in WINDOW_EFFECTS {
        let config = EffectsBuilder::new().effect(effect).build();
        if window.set_effects(config).is_ok() {
            return;
        }
    }
}

fn open_library_db(app: &tauri::AppHandle) -> Result<Database, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("app data dir: {error}"))?;
    std::fs::create_dir_all(&app_data).map_err(|error| format!("create app data dir: {error}"))?;
    Database::open(&app_data.join("library.sqlite"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let db = open_library_db(app.handle()).map_err(|error| {
                std::io::Error::new(std::io::ErrorKind::Other, error)
            })?;
            app.manage(db);
            app.manage(launch::SessionTracker::default());
            app.manage(discord::DiscordRpc::start());

            if let Some(window) = app.get_webview_window("main") {
                apply_liquid_glass(&window);
            }
            overlay::start_hotkey_watcher(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::scan_for_installed_games,
            commands::add_manual_game,
            commands::list_library_games,
            commands::fetch_remote_text,
            commands::cache_game_artwork,
            commands::launch_game,
            commands::update_game_preferences,
            commands::list_running_games,
            commands::load_user_profile,
            commands::save_user_profile,
            commands::save_profile_asset,
            commands::clear_profile_asset,
            commands::load_setup_state,
            commands::save_setup_state,
            commands::reset_setup_state,
            commands::default_install_path,
            commands::pick_install_directory,
            commands::create_local_account,
            commands::login_local_account,
            commands::configure_discord_rpc,
            commands::set_discord_presence,
            commands::clear_discord_presence,
            commands::list_game_achievements,
            commands::sync_game_achievements,
            commands::set_achievement_unlocked,
            commands::get_achievement_summary,
            commands::list_game_media,
            commands::capture_game_screenshot,
            commands::toggle_main_window_visible,
            commands::restart_app,
            commands::apply_window_effects,
            commands::toggle_game_overlay,
            commands::hide_game_overlay,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Slifer");
}
