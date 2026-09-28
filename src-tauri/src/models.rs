use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Platform {
    Steam,
    Epic,
    GOG,
    Custom,
}

impl Platform {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Steam => "Steam",
            Self::Epic => "Epic",
            Self::GOG => "GOG",
            Self::Custom => "Custom",
        }
    }

    pub fn parse(value: &str) -> Self {
        match value {
            "Steam" => Self::Steam,
            "Epic" => Self::Epic,
            "GOG" => Self::GOG,
            _ => Self::Custom,
        }
    }

    pub fn rank(self) -> u8 {
        match self {
            Self::Steam => 4,
            Self::Epic => 3,
            Self::GOG => 2,
            Self::Custom => 1,
        }
    }
}

#[derive(Debug, Clone)]
pub struct DetectedGame {
    pub name: String,
    pub exe_path: PathBuf,
    pub install_dir: PathBuf,
    pub platform: Platform,
    pub collection_tag: Option<String>,
    pub steam_app_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchProfile {
    pub id: String,
    pub label: String,
    #[serde(default)]
    pub exe_path: Option<String>,
    #[serde(default)]
    pub args: Option<String>,
    #[serde(default)]
    pub working_dir: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryGame {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub display_name: Option<String>,
    pub exe_path: String,
    pub install_dir: String,
    pub platform: Platform,
    pub last_played: Option<String>,
    pub playtime_minutes: i64,
    pub added_at: String,
    pub collection_tag: Option<String>,
    pub description: Option<String>,
    pub cover_path: Option<String>,
    pub banner_path: Option<String>,
    pub logo_path: Option<String>,
    pub metadata_source: Option<String>,
    pub metadata_fetched_at: Option<String>,
    pub steam_app_id: Option<i64>,
    pub is_favorite: bool,
    pub is_hidden: bool,
    pub launch_args: Option<String>,
    pub custom_tags: Vec<String>,
    #[serde(default)]
    pub sort_index: Option<i64>,
    #[serde(default)]
    pub launch_profiles: Vec<LaunchProfile>,
    #[serde(default)]
    pub default_profile_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GamePreferences {
    pub game_id: String,
    pub is_favorite: Option<bool>,
    pub is_hidden: Option<bool>,
    pub custom_tags: Option<Vec<String>>,
    pub launch_args: Option<String>,
    pub collection_tag: Option<String>,
    #[serde(default)]
    pub display_name: Option<String>,
    #[serde(default)]
    pub sort_index: Option<i64>,
    #[serde(default)]
    pub launch_profiles: Option<Vec<LaunchProfile>>,
    #[serde(default)]
    pub default_profile_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchResult {
    pub game_id: String,
    pub pid: u32,
    pub profile_id: Option<String>,
    pub profile_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionStarted {
    pub game_id: String,
    pub game_name: String,
    pub steam_app_id: Option<i64>,
    pub pid: u32,
    pub profile_id: Option<String>,
    pub profile_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionEnded {
    pub game: LibraryGame,
    pub pid: u32,
    pub session_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArtworkCacheRequest {
    pub game_id: String,
    pub cover_url: Option<String>,
    pub banner_url: Option<String>,
    pub logo_url: Option<String>,
    pub description: Option<String>,
    pub metadata_source: Option<String>,
    pub steam_app_id: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteFetchRequest {
    pub url: String,
    pub method: Option<String>,
    pub headers: Option<std::collections::HashMap<String, String>>,
    pub body: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    pub phase: String,
    pub message: String,
    pub found: u32,
    pub saved: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub found: u32,
    pub inserted: u32,
    pub updated: u32,
    pub games: Vec<LibraryGame>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetFocus {
    #[serde(default = "default_focus_axis")]
    pub x: f64,
    #[serde(default = "default_focus_axis")]
    pub y: f64,
}

fn default_focus_axis() -> f64 {
    50.0
}

impl Default for AssetFocus {
    fn default() -> Self {
        Self { x: 50.0, y: 50.0 }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserProfile {
    pub username: String,
    pub handle: String,
    pub bio: String,
    pub avatar_path: Option<String>,
    pub banner_path: Option<String>,
    pub background_path: Option<String>,
    #[serde(default)]
    pub avatar_focus: AssetFocus,
    #[serde(default)]
    pub banner_focus: AssetFocus,
    #[serde(default)]
    pub background_focus: AssetFocus,
    pub status: String,
    #[serde(default)]
    pub country_code: Option<String>,
    #[serde(default = "default_featured_badge_id")]
    pub featured_badge_id: String,
}

fn default_featured_badge_id() -> String {
    "level".into()
}

impl Default for UserProfile {
    fn default() -> Self {
        Self {
            username: "Shadownazz".into(),
            handle: "commander".into(),
            bio: String::new(),
            avatar_path: None,
            banner_path: None,
            background_path: None,
            avatar_focus: AssetFocus::default(),
            banner_focus: AssetFocus::default(),
            background_focus: AssetFocus::default(),
            status: "Online".into(),
            country_code: None,
            featured_badge_id: default_featured_badge_id(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetupState {
    pub locale: String,
    pub install_path: Option<String>,
    pub account_id: Option<String>,
    pub setup_complete: bool,
}

impl Default for SetupState {
    fn default() -> Self {
        Self {
            locale: String::new(),
            install_path: None,
            account_id: None,
            setup_complete: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalAccountPublic {
    pub id: String,
    pub username: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateLocalAccountRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginLocalAccountRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscordConfig {
    pub enabled: bool,
    pub client_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscordPresencePayload {
    pub details: String,
    pub state: Option<String>,
    pub large_image: Option<String>,
    pub large_text: Option<String>,
    pub start_timestamp: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AchievementView {
    pub id: String,
    pub game_id: String,
    pub api_name: String,
    pub display_name: String,
    pub description: Option<String>,
    pub icon_path: Option<String>,
    pub icon_locked_path: Option<String>,
    pub hidden: bool,
    pub sort_order: i64,
    pub source: String,
    #[serde(default)]
    pub global_percent: Option<f64>,
    pub unlocked: bool,
    pub unlocked_at: Option<String>,
    pub unlock_source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AchievementSummary {
    pub game_id: String,
    pub total: i64,
    pub unlocked: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AchievementSyncResult {
    pub game_id: String,
    pub imported_defs: u32,
    pub imported_unlocks: u32,
    pub achievements: Vec<AchievementView>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaItem {
    pub id: String,
    pub game_id: String,
    pub path: String,
    pub kind: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItadPublicConfig {
    pub api_key: String,
    pub client_id: String,
    pub client_secret: String,
    pub country: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItadOAuthConfig {
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
    pub scopes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItadSessionView {
    pub connected: bool,
    pub access_token: Option<String>,
    pub expires_at: Option<i64>,
    pub username: Option<String>,
}
