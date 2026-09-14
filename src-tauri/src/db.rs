use crate::models::{
    AchievementSummary, AchievementView, DetectedGame, GamePreferences, LibraryGame, Platform,
};
use rusqlite::{params, Connection, OptionalExtension};
use sha2::{Digest, Sha256};
use std::path::Path;
use std::sync::{Arc, Mutex};
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

const SCHEMA: &str = include_str!("schema.sql");
const GAME_COLUMNS: &str = "SELECT id, name, display_name, exe_path, install_dir, platform, last_played,
        playtime_minutes, added_at, collection_tag, description, cover_path, banner_path,
        logo_path, metadata_source, metadata_fetched_at, steam_app_id,
        is_favorite, is_hidden, launch_args, custom_tags, sort_index,
        launch_profiles, default_profile_id
     FROM games";
const GAME_SELECT: &str = "SELECT id, name, display_name, exe_path, install_dir, platform, last_played,
        playtime_minutes, added_at, collection_tag, description, cover_path, banner_path,
        logo_path, metadata_source, metadata_fetched_at, steam_app_id,
        is_favorite, is_hidden, launch_args, custom_tags, sort_index,
        launch_profiles, default_profile_id
     FROM games
     ORDER BY name COLLATE NOCASE ASC";

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn open(path: &Path) -> Result<Self, String> {
        let conn = Connection::open(path).map_err(db_err)?;
        conn.pragma_update(None, "journal_mode", "WAL")
            .map_err(db_err)?;
        conn.pragma_update(None, "foreign_keys", "ON")
            .map_err(db_err)?;
        conn.execute_batch(SCHEMA).map_err(db_err)?;
        migrate_games_table(&conn)?;
        reset_failed_artwork(&conn)?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn list_games(&self) -> Result<Vec<LibraryGame>, String> {
        let conn = self.conn.lock().map_err(|_| "database lock poisoned")?;
        let mut stmt = conn
            .prepare(GAME_SELECT)
            .map_err(db_err)?;

        let rows = stmt
            .query_map([], map_game_row)
            .map_err(db_err)?;

        rows.collect::<Result<Vec<_>, _>>().map_err(db_err)
    }

    pub fn get_game(&self, id: &str) -> Result<Option<LibraryGame>, String> {
        let conn = self.conn.lock().map_err(|_| "database lock poisoned")?;
        conn.query_row(
            &format!("{GAME_COLUMNS} WHERE id = ?1"),
            params![id],
            map_game_row,
        )
        .optional()
        .map_err(db_err)
    }

    pub fn update_metadata(
        &self,
        id: &str,
        description: Option<&str>,
        cover_path: Option<&str>,
        banner_path: Option<&str>,
        logo_path: Option<&str>,
        metadata_source: Option<&str>,
        steam_app_id: Option<i64>,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|_| "database lock poisoned")?;
        conn.execute(
            "UPDATE games SET
                description = COALESCE(?1, description),
                cover_path = COALESCE(?2, cover_path),
                banner_path = COALESCE(?3, banner_path),
                logo_path = COALESCE(?4, logo_path),
                metadata_source = COALESCE(?5, metadata_source),
                metadata_fetched_at = ?6,
                steam_app_id = COALESCE(?7, steam_app_id)
             WHERE id = ?8",
            params![
                description,
                cover_path,
                banner_path,
                logo_path,
                metadata_source,
                now_rfc3339(),
                steam_app_id,
                id
            ],
        )
        .map_err(db_err)?;
        Ok(())
    }

    pub fn record_play_session(&self, id: &str, session_seconds: u64) -> Result<LibraryGame, String> {
        let minutes = i64::try_from(session_seconds.div_ceil(60)).unwrap_or(1).max(1);
        let conn = self.conn.lock().map_err(|_| "database lock poisoned")?;
        conn.execute(
            "UPDATE games
             SET last_played = ?1,
                 playtime_minutes = playtime_minutes + ?2
             WHERE id = ?3",
            params![now_rfc3339(), minutes, id],
        )
        .map_err(db_err)?;
        drop(conn);
        self.get_game(id)?
            .ok_or_else(|| format!("game {id} missing after play session"))
    }

    pub fn update_preferences(&self, prefs: &GamePreferences) -> Result<LibraryGame, String> {
        let conn = self.conn.lock().map_err(|_| "database lock poisoned")?;
        let tags = prefs
            .custom_tags
            .as_ref()
            .map(|value| serde_json::to_string(value).unwrap_or_else(|_| "[]".into()));

        let profiles = prefs.launch_profiles.as_ref().map(|value| {
            serde_json::to_string(value).unwrap_or_else(|_| "[]".into())
        });

        conn.execute(
            "UPDATE games SET
                is_favorite = COALESCE(?1, is_favorite),
                is_hidden = COALESCE(?2, is_hidden),
                custom_tags = COALESCE(?3, custom_tags),
                launch_args = COALESCE(?4, launch_args),
                collection_tag = COALESCE(?5, collection_tag),
                display_name = CASE
                    WHEN ?6 IS NULL THEN display_name
                    WHEN trim(?6) = '' THEN NULL
                    ELSE trim(?6)
                END,
                sort_index = COALESCE(?7, sort_index),
                launch_profiles = COALESCE(?8, launch_profiles),
                default_profile_id = CASE
                    WHEN ?9 IS NULL THEN default_profile_id
                    WHEN trim(?9) = '' THEN NULL
                    ELSE trim(?9)
                END
             WHERE id = ?10",
            params![
                prefs.is_favorite.map(|value| i64::from(value)),
                prefs.is_hidden.map(|value| i64::from(value)),
                tags,
                prefs.launch_args,
                prefs.collection_tag,
                prefs.display_name,
                prefs.sort_index,
                profiles,
                prefs.default_profile_id,
                prefs.game_id
            ],
        )
        .map_err(db_err)?;
        drop(conn);
        self.get_game(&prefs.game_id)?
            .ok_or_else(|| format!("game {} missing after preference update", prefs.game_id))
    }

    pub fn upsert_detected(&self, game: &DetectedGame) -> Result<UpsertKind, String> {
        let exe_path = normalize_path(&game.exe_path);
        let install_dir = normalize_path(&game.install_dir);
        let id = game_id(&exe_path);
        let now = now_rfc3339();

        let conn = self.conn.lock().map_err(|_| "database lock poisoned")?;
        let existing: Option<(String, String)> = conn
            .query_row(
                "SELECT platform, collection_tag FROM games WHERE exe_path = ?1",
                params![exe_path],
                |row| Ok((row.get(0)?, row.get::<_, Option<String>>(1)?.unwrap_or_default())),
            )
            .optional()
            .map_err(db_err)?;

        if let Some((current_platform, current_tag)) = existing {
            let platform = if game.platform.rank() >= Platform::parse(&current_platform).rank() {
                game.platform.as_str()
            } else {
                current_platform.as_str()
            };
            let collection_tag = if current_tag.is_empty() {
                game.collection_tag.clone()
            } else {
                Some(current_tag)
            };

            conn.execute(
                "UPDATE games
                 SET name = ?1, install_dir = ?2, platform = ?3, collection_tag = ?4,
                     steam_app_id = COALESCE(?5, steam_app_id)
                 WHERE exe_path = ?6",
                params![
                    game.name,
                    install_dir,
                    platform,
                    collection_tag,
                    game.steam_app_id,
                    exe_path
                ],
            )
            .map_err(db_err)?;
            return Ok(UpsertKind::Updated);
        }

        conn.execute(
            "INSERT INTO games (
                id, name, exe_path, install_dir, platform,
                last_played, playtime_minutes, added_at, collection_tag, steam_app_id
             ) VALUES (?1, ?2, ?3, ?4, ?5, NULL, 0, ?6, ?7, ?8)",
            params![
                id,
                game.name,
                exe_path,
                install_dir,
                game.platform.as_str(),
                now,
                game.collection_tag,
                game.steam_app_id,
            ],
        )
        .map_err(db_err)?;

        Ok(UpsertKind::Inserted)
    }

    pub fn delete_game(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|_| "database lock poisoned")?;
        conn.execute("DELETE FROM games WHERE id = ?1", params![id])
            .map_err(db_err)?;
        Ok(())
    }

    pub fn list_achievements(&self, game_id: &str) -> Result<Vec<AchievementView>, String> {
        let conn = self.conn.lock().map_err(|_| "database lock poisoned")?;
        let mut stmt = conn
            .prepare(
                "SELECT d.id, d.game_id, d.api_name, d.display_name, d.description,
                        d.icon_path, d.icon_locked_path, d.hidden, d.sort_order, d.source,
                        d.global_percent, u.unlocked_at, u.unlock_source
                 FROM achievement_defs d
                 LEFT JOIN achievement_unlocks u
                   ON u.game_id = d.game_id AND u.api_name = d.api_name
                 WHERE d.game_id = ?1
                 ORDER BY d.sort_order ASC, d.display_name COLLATE NOCASE ASC",
            )
            .map_err(db_err)?;
        let rows = stmt
            .query_map(params![game_id], map_achievement_row)
            .map_err(db_err)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(db_err)
    }

    pub fn achievement_summary(&self, game_id: &str) -> Result<AchievementSummary, String> {
        let conn = self.conn.lock().map_err(|_| "database lock poisoned")?;
        conn.query_row(
            "SELECT
                (SELECT COUNT(*) FROM achievement_defs WHERE game_id = ?1),
                (SELECT COUNT(*) FROM achievement_unlocks u
                 INNER JOIN achievement_defs d
                   ON d.game_id = u.game_id AND d.api_name = u.api_name
                 WHERE u.game_id = ?1 AND u.unlocked_at IS NOT NULL)",
            params![game_id],
            |row| {
                Ok(AchievementSummary {
                    game_id: game_id.to_string(),
                    total: row.get(0)?,
                    unlocked: row.get(1)?,
                })
            },
        )
        .map_err(db_err)
    }

    pub fn upsert_achievement_def(
        &self,
        game_id: &str,
        api_name: &str,
        display_name: &str,
        description: Option<&str>,
        icon_path: Option<&str>,
        icon_locked_path: Option<&str>,
        hidden: bool,
        sort_order: i64,
        source: &str,
        global_percent: Option<f64>,
    ) -> Result<(), String> {
        let id = format!("{game_id}:{api_name}");
        let conn = self.conn.lock().map_err(|_| "database lock poisoned")?;
        conn.execute(
            "INSERT INTO achievement_defs (
                id, game_id, api_name, display_name, description,
                icon_path, icon_locked_path, hidden, sort_order, source, global_percent
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
             ON CONFLICT(game_id, api_name) DO UPDATE SET
                display_name = excluded.display_name,
                description = COALESCE(excluded.description, achievement_defs.description),
                icon_path = COALESCE(excluded.icon_path, achievement_defs.icon_path),
                icon_locked_path = COALESCE(excluded.icon_locked_path, achievement_defs.icon_locked_path),
                hidden = excluded.hidden,
                sort_order = excluded.sort_order,
                source = excluded.source,
                global_percent = COALESCE(excluded.global_percent, achievement_defs.global_percent)",
            params![
                id,
                game_id,
                api_name,
                display_name,
                description,
                icon_path,
                icon_locked_path,
                i64::from(hidden),
                sort_order,
                source,
                global_percent
            ],
        )
        .map_err(db_err)?;
        Ok(())
    }

    pub fn set_achievement_unlocked(
        &self,
        game_id: &str,
        api_name: &str,
        unlocked: bool,
        unlock_source: &str,
    ) -> Result<AchievementView, String> {
        let conn = self.conn.lock().map_err(|_| "database lock poisoned")?;
        let exists: bool = conn
            .query_row(
                "SELECT 1 FROM achievement_defs WHERE game_id = ?1 AND api_name = ?2",
                params![game_id, api_name],
                |_| Ok(true),
            )
            .optional()
            .map_err(db_err)?
            .unwrap_or(false);
        if !exists {
            return Err(format!("achievement {api_name} not found for game {game_id}"));
        }

        if unlocked {
            conn.execute(
                "INSERT INTO achievement_unlocks (game_id, api_name, unlocked_at, unlock_source)
                 VALUES (?1, ?2, ?3, ?4)
                 ON CONFLICT(game_id, api_name) DO UPDATE SET
                    unlocked_at = excluded.unlocked_at,
                    unlock_source = excluded.unlock_source",
                params![game_id, api_name, now_rfc3339(), unlock_source],
            )
            .map_err(db_err)?;
        } else {
            conn.execute(
                "DELETE FROM achievement_unlocks WHERE game_id = ?1 AND api_name = ?2",
                params![game_id, api_name],
            )
            .map_err(db_err)?;
        }
        drop(conn);

        self.list_achievements(game_id)?
            .into_iter()
            .find(|item| item.api_name == api_name)
            .ok_or_else(|| format!("achievement {api_name} missing after unlock update"))
    }

    pub fn mark_achievements_unlocked(
        &self,
        game_id: &str,
        api_names: &[String],
        unlock_source: &str,
    ) -> Result<u32, String> {
        let defs = self.list_achievements(game_id)?;
        let mut marked = 0u32;
        for api_name in api_names {
            let Some(def) = defs
                .iter()
                .find(|item| item.api_name.eq_ignore_ascii_case(api_name))
            else {
                continue;
            };
            if self
                .set_achievement_unlocked(game_id, &def.api_name, true, unlock_source)
                .is_ok()
            {
                marked += 1;
            }
        }
        Ok(marked)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UpsertKind {
    Inserted,
    Updated,
}

fn map_game_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<LibraryGame> {
    Ok(LibraryGame {
        id: row.get(0)?,
        name: row.get(1)?,
        display_name: row.get(2)?,
        exe_path: row.get(3)?,
        install_dir: row.get(4)?,
        platform: Platform::parse(&row.get::<_, String>(5)?),
        last_played: row.get(6)?,
        playtime_minutes: row.get(7)?,
        added_at: row.get(8)?,
        collection_tag: row.get(9)?,
        description: row.get(10)?,
        cover_path: row.get(11)?,
        banner_path: row.get(12)?,
        logo_path: row.get(13)?,
        metadata_source: row.get(14)?,
        metadata_fetched_at: row.get(15)?,
        steam_app_id: row.get(16)?,
        is_favorite: row.get::<_, i64>(17)? != 0,
        is_hidden: row.get::<_, i64>(18)? != 0,
        launch_args: row.get(19)?,
        custom_tags: parse_tags(row.get::<_, Option<String>>(20)?),
        sort_index: row.get(21)?,
        launch_profiles: parse_profiles(row.get::<_, Option<String>>(22)?),
        default_profile_id: row.get(23)?,
    })
}

fn map_achievement_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<AchievementView> {
    let unlocked_at: Option<String> = row.get(11)?;
    Ok(AchievementView {
        id: row.get(0)?,
        game_id: row.get(1)?,
        api_name: row.get(2)?,
        display_name: row.get(3)?,
        description: row.get(4)?,
        icon_path: row.get(5)?,
        icon_locked_path: row.get(6)?,
        hidden: row.get::<_, i64>(7)? != 0,
        sort_order: row.get(8)?,
        source: row.get(9)?,
        global_percent: row.get(10)?,
        unlocked: unlocked_at.is_some(),
        unlocked_at,
        unlock_source: row.get(12)?,
    })
}

fn parse_tags(raw: Option<String>) -> Vec<String> {
    let Some(raw) = raw.filter(|value| !value.trim().is_empty()) else {
        return Vec::new();
    };
    serde_json::from_str(&raw).unwrap_or_default()
}

fn parse_profiles(raw: Option<String>) -> Vec<crate::models::LaunchProfile> {
    let Some(raw) = raw.filter(|value| !value.trim().is_empty()) else {
        return Vec::new();
    };
    serde_json::from_str(&raw).unwrap_or_default()
}

fn migrate_games_table(conn: &Connection) -> Result<(), String> {
    let mut existing = std::collections::HashSet::new();
    let mut stmt = conn
        .prepare("PRAGMA table_info(games)")
        .map_err(db_err)?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(db_err)?;
    for name in rows.flatten() {
        existing.insert(name);
    }

    let columns = [
        ("description", "TEXT"),
        ("cover_path", "TEXT"),
        ("banner_path", "TEXT"),
        ("logo_path", "TEXT"),
        ("metadata_source", "TEXT"),
        ("metadata_fetched_at", "TEXT"),
        ("steam_app_id", "INTEGER"),
        ("is_favorite", "INTEGER NOT NULL DEFAULT 0"),
        ("is_hidden", "INTEGER NOT NULL DEFAULT 0"),
        ("launch_args", "TEXT"),
        ("custom_tags", "TEXT NOT NULL DEFAULT '[]'"),
        ("display_name", "TEXT"),
        ("sort_index", "INTEGER"),
        ("launch_profiles", "TEXT NOT NULL DEFAULT '[]'"),
        ("default_profile_id", "TEXT"),
    ];

    for (name, decl) in columns {
        if existing.contains(name) {
            continue;
        }
        conn.execute(
            &format!("ALTER TABLE games ADD COLUMN {name} {decl}"),
            [],
        )
        .map_err(db_err)?;
    }

    Ok(())
}

fn reset_failed_artwork(conn: &Connection) -> Result<(), String> {
    let version: i64 = conn
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .map_err(db_err)?;
    if version < 2 {
        conn.execute(
            "UPDATE games
             SET metadata_fetched_at = NULL, metadata_source = NULL
             WHERE cover_path IS NULL AND banner_path IS NULL",
            [],
        )
        .map_err(db_err)?;
    }
    if version < 3 {
        conn.execute(
            "UPDATE games
             SET metadata_fetched_at = NULL
             WHERE steam_app_id IS NULL",
            [],
        )
        .map_err(db_err)?;
    }
    if version < 4 {
        conn.execute(
            "UPDATE games
             SET metadata_fetched_at = NULL, metadata_source = NULL
             WHERE steam_app_id IS NULL AND cover_path IS NULL AND banner_path IS NULL",
            [],
        )
        .map_err(db_err)?;
        conn.pragma_update(None, "user_version", 4)
            .map_err(db_err)?;
    }
    if version < 5 {
        conn.execute(
            "UPDATE games
             SET metadata_fetched_at = NULL, metadata_source = NULL
             WHERE cover_path IS NULL AND banner_path IS NULL",
            [],
        )
        .map_err(db_err)?;
        conn.pragma_update(None, "user_version", 5)
            .map_err(db_err)?;
    }
    if version < 6 {
        conn.pragma_update(None, "user_version", 6)
            .map_err(db_err)?;
    }
    if version < 7 {
        conn.pragma_update(None, "user_version", 7)
            .map_err(db_err)?;
    }
    if version < 8 {
        conn.pragma_update(None, "user_version", 8)
            .map_err(db_err)?;
    }
    if version < 9 {
        let mut has_global = false;
        let mut stmt = conn
            .prepare("PRAGMA table_info(achievement_defs)")
            .map_err(db_err)?;
        let rows = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .map_err(db_err)?;
        for name in rows.flatten() {
            if name == "global_percent" {
                has_global = true;
            }
        }
        if !has_global {
            conn.execute(
                "ALTER TABLE achievement_defs ADD COLUMN global_percent REAL",
                [],
            )
            .map_err(db_err)?;
        }
        conn.pragma_update(None, "user_version", 9)
            .map_err(db_err)?;
    }
    Ok(())
}

fn db_err(error: rusqlite::Error) -> String {
    format!("sqlite: {error}")
}

fn now_rfc3339() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".into())
}

pub fn normalize_path(path: &Path) -> String {
    path.to_string_lossy()
        .replace('/', "\\")
        .trim_end_matches(['\\', '/'])
        .to_string()
}

pub fn game_id(exe_path: &str) -> String {
    let digest = Sha256::digest(exe_path.to_ascii_lowercase().as_bytes());
    hex::encode(&digest[..12])
}
