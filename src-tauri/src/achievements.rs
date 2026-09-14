use crate::db::Database;
use crate::models::{AchievementSyncResult, AchievementView};
use crate::scanner::steam;
use reqwest::header::CONTENT_TYPE;
use serde::Deserialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::Duration;

const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const STEAM_ID64_BASE: u64 = 76561197960265728;

#[derive(Debug, Clone)]
struct SchemaAchievement {
    api_name: String,
    display_name: String,
    description: Option<String>,
    icon_url: Option<String>,
    icon_locked_url: Option<String>,
    hidden: bool,
    unlocked: bool,
    global_percent: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct SchemaResponse {
    game: Option<SchemaGame>,
}

#[derive(Debug, Deserialize)]
struct SchemaGame {
    #[serde(rename = "availableGameStats")]
    available_game_stats: Option<AvailableStats>,
}

#[derive(Debug, Deserialize)]
struct AvailableStats {
    achievements: Option<Vec<SchemaAchievementJson>>,
}

#[derive(Debug, Deserialize)]
struct SchemaAchievementJson {
    name: String,
    #[serde(rename = "displayName")]
    display_name: Option<String>,
    description: Option<String>,
    icon: Option<String>,
    icongray: Option<String>,
    #[serde(default)]
    hidden: i64,
}

#[derive(Debug, Deserialize)]
struct GlobalPercentagesResponse {
    achievementpercentages: Option<GlobalPercentages>,
}

#[derive(Debug, Deserialize)]
struct GlobalPercentages {
    achievements: Option<Vec<GlobalAchievement>>,
}

#[derive(Debug, Deserialize)]
struct GlobalAchievement {
    name: String,
    percent: String,
}

#[derive(Debug, Deserialize)]
struct PlayerAchievementsResponse {
    playerstats: Option<PlayerStats>,
}

#[derive(Debug, Deserialize)]
struct PlayerStats {
    achievements: Option<Vec<PlayerAchievement>>,
    success: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct PlayerAchievement {
    apiname: String,
    achieved: i64,
}

pub async fn sync_game_achievements(
    db: &Database,
    game_id: &str,
) -> Result<AchievementSyncResult, String> {
    let game = db
        .get_game(game_id)?
        .ok_or_else(|| format!("game {game_id} not found"))?;

    let mut notes: Vec<String> = Vec::new();
    let mut imported_defs = 0u32;
    let mut imported_unlocks = 0u32;

    // Slifer-native achievements always sync for every game.
    let (slifer_defs, slifer_unlocks) = ensure_slifer_achievements(db, &game)?;
    imported_defs += slifer_defs;
    imported_unlocks += slifer_unlocks;
    notes.push(format!("Slifer +{slifer_defs}"));

    let platform = game.platform.as_str();
    let has_steam_id = game.steam_app_id.filter(|id| *id > 0).is_some();

    if has_steam_id || platform.eq_ignore_ascii_case("Steam") {
        match sync_steam_achievements(db, &game).await {
            Ok((defs, unlocks, note)) => {
                imported_defs += defs;
                imported_unlocks += unlocks;
                if let Some(note) = note {
                    notes.push(note);
                }
            }
            Err(error) => notes.push(format!("Steam: {error}")),
        }
    }

    if platform.eq_ignore_ascii_case("Epic") {
        notes.push("Epic achievement providers arrive next — Slifer local trackers are active.".into());
    } else if platform.eq_ignore_ascii_case("GOG") {
        notes.push("GOG Galaxy achievement sync is stubbed — Slifer local trackers are active.".into());
    } else if platform.eq_ignore_ascii_case("Custom") && !has_steam_id {
        notes.push("No store schema found — Slifer achievements still track launches and playtime.".into());
    }

    let achievements = db.list_achievements(game_id)?;
    Ok(AchievementSyncResult {
        game_id: game_id.to_string(),
        imported_defs,
        imported_unlocks,
        achievements,
        message: Some(notes.join(" · ")),
    })
}

fn ensure_slifer_achievements(
    db: &Database,
    game: &crate::models::LibraryGame,
) -> Result<(u32, u32), String> {
    let catalog = [
        (
            "slifer_first_launch",
            "First Flight",
            "Launch this game from Slifer at least once.",
            game.last_played.is_some() || game.playtime_minutes > 0,
            -40i64,
        ),
        (
            "slifer_hour_one",
            "Hour One",
            "Log at least 1 hour of playtime in Slifer.",
            game.playtime_minutes >= 60,
            -30,
        ),
        (
            "slifer_ten_hours",
            "Veteran Wing",
            "Log at least 10 hours of playtime in Slifer.",
            game.playtime_minutes >= 600,
            -20,
        ),
        (
            "slifer_favorite",
            "Marked Prey",
            "Mark this game as a favorite in Slifer.",
            game.is_favorite,
            -10,
        ),
    ];

    let mut defs = 0u32;
    let mut unlocks = 0u32;
    for (api, title, detail, earned, order) in catalog {
        db.upsert_achievement_def(
            &game.id,
            api,
            title,
            Some(detail),
            None,
            None,
            false,
            order,
            "slifer",
            None,
        )?;
        defs += 1;
        if earned {
            let _ = db.set_achievement_unlocked(&game.id, api, true, "slifer")?;
            unlocks += 1;
        }
    }
    Ok((defs, unlocks))
}

async fn sync_steam_achievements(
    db: &Database,
    game: &crate::models::LibraryGame,
) -> Result<(u32, u32, Option<String>), String> {
    let Some(app_id) = game.steam_app_id.filter(|id| *id > 0) else {
        return Ok((0, 0, Some("No Steam App ID".into())));
    };

    let player_dump = fetch_best_player_dump(app_id).await?;
    let schema = if let Some(ref dump) = player_dump {
        dump.clone()
    } else {
        fetch_steam_schema(app_id).await?
    };

    let percents = fetch_global_percent_map(app_id).await.unwrap_or_default();
    let cache_dir = achievement_cache_dir(&game.id)?;
    let mut imported_defs = 0u32;

    for (index, entry) in schema.iter().enumerate() {
        let icon_path = download_icon(
            &entry.icon_url,
            &cache_dir,
            &format!("{}_open", sanitize_name(&entry.api_name)),
        )
        .await?;
        let icon_locked_path = download_icon(
            &entry.icon_locked_url,
            &cache_dir,
            &format!("{}_locked", sanitize_name(&entry.api_name)),
        )
        .await?;
        let percent = entry
            .global_percent
            .or_else(|| percents.get(&entry.api_name.to_ascii_lowercase()).copied());

        db.upsert_achievement_def(
            &game.id,
            &entry.api_name,
            &entry.display_name,
            entry.description.as_deref(),
            icon_path.as_deref(),
            icon_locked_path.as_deref(),
            entry.hidden,
            index as i64,
            "steam",
            percent,
        )?;
        imported_defs += 1;
    }

    let unlocked_names: Vec<String> = if let Some(ref dump) = player_dump {
        dump.iter()
            .filter(|item| item.unlocked)
            .map(|item| item.api_name.clone())
            .collect()
    } else {
        fetch_player_achievements_api(app_id)
            .await?
            .unwrap_or_default()
    };

    let imported_unlocks = if unlocked_names.is_empty() {
        0
    } else {
        db.mark_achievements_unlocked(&game.id, &unlocked_names, "steam")?
    };

    let note = if imported_unlocks > 0 {
        Some(format!(
            "Steam synced {imported_defs} defs / {imported_unlocks} unlocks"
        ))
    } else {
        Some(format!("Steam synced {imported_defs} defs"))
    };
    Ok((imported_defs, imported_unlocks, note))
}

async fn fetch_global_percent_map(app_id: i64) -> Result<HashMap<String, f64>, String> {
    let client = http_client()?;
    let url = format!(
        "https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid={app_id}"
    );
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|error| format!("global achievements: {error}"))?;
    let payload: GlobalPercentagesResponse = response
        .json()
        .await
        .map_err(|error| format!("global achievements json: {error}"))?;
    let mut map = HashMap::new();
    for item in payload
        .achievementpercentages
        .and_then(|value| value.achievements)
        .unwrap_or_default()
    {
        if let Ok(value) = item.percent.parse::<f64>() {
            map.insert(item.name.to_ascii_lowercase(), value);
        }
    }
    Ok(map)
}

pub fn list_game_achievements(db: &Database, game_id: &str) -> Result<Vec<AchievementView>, String> {
    db.list_achievements(game_id)
}

pub fn set_unlocked(
    db: &Database,
    game_id: &str,
    api_name: &str,
    unlocked: bool,
) -> Result<AchievementView, String> {
    db.set_achievement_unlocked(game_id, api_name, unlocked, "manual")
}

pub fn summary(
    db: &Database,
    game_id: &str,
) -> Result<crate::models::AchievementSummary, String> {
    db.achievement_summary(game_id)
}

async fn fetch_best_player_dump(app_id: i64) -> Result<Option<Vec<SchemaAchievement>>, String> {
    let client = http_client()?;
    let mut best: Option<(usize, Vec<SchemaAchievement>)> = None;

    for steam_id in discover_steam_ids() {
        let url = format!(
            "https://steamcommunity.com/profiles/{steam_id}/stats/{app_id}/achievements/?xml=1"
        );
        let Ok(response) = client.get(&url).send().await else {
            continue;
        };
        if !response.status().is_success() {
            continue;
        }
        let Ok(text) = response.text().await else {
            continue;
        };
        if text.contains("<error>") || !text.contains("<achievement") {
            continue;
        }
        let items = parse_player_achievement_xml(&text);
        if items.is_empty() {
            continue;
        }
        let unlocked = items.iter().filter(|item| item.unlocked).count();
        let replace = match &best {
            None => true,
            Some((current, _)) => unlocked > *current,
        };
        if replace {
            best = Some((unlocked, items));
        }
    }

    Ok(best.map(|(_, items)| items))
}

fn parse_player_achievement_xml(text: &str) -> Vec<SchemaAchievement> {
    let mut items = Vec::new();
    for block in text.split("<achievement").skip(1) {
        let chunk = block.split("</achievement>").next().unwrap_or(block);
        let api_name = xml_tag(chunk, "apiname").unwrap_or_default();
        if api_name.is_empty() {
            continue;
        }
        let display_name = xml_tag(chunk, "name")
            .filter(|value| !value.eq_ignore_ascii_case(&api_name))
            .unwrap_or_else(|| api_name.clone());
        let unlocked = chunk.contains("closed=\"1\"") || chunk.starts_with(" closed=\"1\"");
        items.push(SchemaAchievement {
            api_name,
            display_name,
            description: xml_tag(chunk, "description"),
            // Steam: iconClosed = color (unlocked art), iconOpen = gray (locked art)
            icon_url: xml_tag(chunk, "iconClosed"),
            icon_locked_url: xml_tag(chunk, "iconOpen"),
            hidden: false,
            unlocked,
            global_percent: None,
        });
    }
    items
}

async fn fetch_steam_schema(app_id: i64) -> Result<Vec<SchemaAchievement>, String> {
    if let Ok(items) = fetch_schema_api(app_id).await {
        if !items.is_empty() {
            return Ok(items);
        }
    }
    if let Ok(items) = fetch_schema_community_html(app_id).await {
        if !items.is_empty() {
            return Ok(items);
        }
    }
    Err("Could not load Steam achievement schema for this App ID".into())
}

async fn fetch_schema_api(app_id: i64) -> Result<Vec<SchemaAchievement>, String> {
    let client = http_client()?;
    let mut urls = Vec::new();
    if let Ok(key) = std::env::var("STEAM_WEB_API_KEY") {
        let key = key.trim();
        if !key.is_empty() {
            urls.push(format!(
                "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key={key}&appid={app_id}&l=english"
            ));
        }
    }
    urls.push(format!(
        "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?appid={app_id}&l=english"
    ));

    for url in urls {
        let Ok(response) = client.get(&url).send().await else {
            continue;
        };
        if !response.status().is_success() {
            continue;
        }
        let Ok(payload) = response.json::<SchemaResponse>().await else {
            continue;
        };
        let Some(items) = payload
            .game
            .and_then(|game| game.available_game_stats)
            .and_then(|stats| stats.achievements)
        else {
            continue;
        };
        let mapped = items
            .into_iter()
            .filter(|item| !item.name.trim().is_empty())
            .map(|item| SchemaAchievement {
                display_name: item
                    .display_name
                    .filter(|value| !value.trim().is_empty())
                    .unwrap_or_else(|| item.name.clone()),
                description: item.description,
                icon_url: item.icon,
                icon_locked_url: item.icongray,
                hidden: item.hidden != 0,
                api_name: item.name,
                unlocked: false,
                global_percent: None,
            })
            .collect::<Vec<_>>();
        if !mapped.is_empty() {
            return Ok(mapped);
        }
    }

    Err("Steam schema API unavailable".into())
}

async fn fetch_schema_community_html(app_id: i64) -> Result<Vec<SchemaAchievement>, String> {
    let client = http_client()?;
    let url = format!("https://steamcommunity.com/stats/{app_id}/achievements/");
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|error| format!("community achievements: {error}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "community achievements HTTP {}",
            response.status()
        ));
    }
    let text = response
        .text()
        .await
        .map_err(|error| format!("community achievements body: {error}"))?;

    let mut rows = Vec::new();
    let re = regex_lite_achieve_rows(&text);
    for (img, name, desc, percent) in re {
        rows.push((img, name, desc, percent));
    }

    if rows.is_empty() {
        return Err("No achievements found on Steam community page".into());
    }

    let api_by_percent = fetch_global_api_names_by_percent(app_id).await.unwrap_or_default();
    let mut used_names = std::collections::HashSet::new();
    let mut items = Vec::new();

    for (index, (img, display_name, description, percent)) in rows.into_iter().enumerate() {
        let api_name = api_by_percent
            .get(&percent)
            .cloned()
            .or_else(|| {
                // Fall back to first unused global name in order
                None
            })
            .unwrap_or_else(|| format!("ACH_HTML_{index}"));

        let api_name = if used_names.insert(api_name.to_ascii_lowercase()) {
            api_name
        } else {
            format!("ACH_HTML_{index}")
        };

        items.push(SchemaAchievement {
            api_name,
            display_name,
            description: if description.is_empty() {
                None
            } else {
                Some(description)
            },
            icon_url: Some(img.clone()),
            icon_locked_url: Some(img),
            hidden: false,
            unlocked: false,
            global_percent: percent.parse::<f64>().ok(),
        });
    }

    // If percent matching failed for many, re-zip by global list order
    if let Ok(globals) = fetch_global_api_name_list(app_id).await {
        if globals.len() == items.len() {
            for (item, name) in items.iter_mut().zip(globals) {
                item.api_name = name;
            }
        }
    }

    Ok(items)
}

fn regex_lite_achieve_rows(text: &str) -> Vec<(String, String, String, String)> {
    let mut out = Vec::new();
    for block in text.split(r#"class="achieveRow"#).skip(1) {
        let chunk = block.split(r#"class="achieveRow"#).next().unwrap_or(block);
        let img = attr_after(chunk, "img src=\"").unwrap_or_default();
        let name = tag_inner(chunk, "h3").unwrap_or_default();
        let desc = tag_inner(chunk, "h5").unwrap_or_default();
        let percent = tag_inner(chunk, "div class=\"achievePercent\"")
            .or_else(|| {
                chunk
                    .find("achievePercent")
                    .and_then(|_| tag_inner_from(chunk, "achievePercent"))
            })
            .unwrap_or_default()
            .trim()
            .trim_end_matches('%')
            .trim()
            .to_string();
        if name.is_empty() {
            continue;
        }
        out.push((img, name, desc, percent));
    }
    out
}

fn attr_after(chunk: &str, marker: &str) -> Option<String> {
    let start = chunk.find(marker)? + marker.len();
    let end = chunk[start..].find('"')? + start;
    Some(chunk[start..end].to_string())
}

fn tag_inner(chunk: &str, tag: &str) -> Option<String> {
    let open = format!("<{tag}>");
    let start = chunk.find(&open)? + open.len();
    let end = chunk[start..].find('<')? + start;
    Some(chunk[start..end].trim().to_string())
}

fn tag_inner_from(chunk: &str, class_marker: &str) -> Option<String> {
    let idx = chunk.find(class_marker)?;
    let after = &chunk[idx..];
    let start = after.find('>')? + 1;
    let end = after[start..].find('<')? + start;
    Some(after[start..end].trim().to_string())
}

async fn fetch_global_api_names_by_percent(app_id: i64) -> Result<HashMap<String, String>, String> {
    let client = http_client()?;
    let url = format!(
        "https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid={app_id}"
    );
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|error| format!("global achievements: {error}"))?;
    let payload: GlobalPercentagesResponse = response
        .json()
        .await
        .map_err(|error| format!("global achievements json: {error}"))?;
    let mut map = HashMap::new();
    for item in payload
        .achievementpercentages
        .and_then(|value| value.achievements)
        .unwrap_or_default()
    {
        map.insert(item.percent.clone(), item.name);
    }
    Ok(map)
}

async fn fetch_global_api_name_list(app_id: i64) -> Result<Vec<String>, String> {
    let client = http_client()?;
    let url = format!(
        "https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid={app_id}"
    );
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|error| format!("global achievements: {error}"))?;
    let payload: GlobalPercentagesResponse = response
        .json()
        .await
        .map_err(|error| format!("global achievements json: {error}"))?;
    Ok(payload
        .achievementpercentages
        .and_then(|value| value.achievements)
        .unwrap_or_default()
        .into_iter()
        .map(|item| item.name)
        .collect())
}

async fn fetch_player_achievements_api(app_id: i64) -> Result<Option<Vec<String>>, String> {
    let Ok(key) = std::env::var("STEAM_WEB_API_KEY") else {
        return Ok(None);
    };
    let key = key.trim().to_string();
    if key.is_empty() {
        return Ok(None);
    }

    let client = http_client()?;
    for steam_id in discover_steam_ids() {
        let url = format!(
            "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key={key}&steamid={steam_id}&appid={app_id}"
        );
        let Ok(response) = client.get(&url).send().await else {
            continue;
        };
        if !response.status().is_success() {
            continue;
        }
        let Ok(payload) = response.json::<PlayerAchievementsResponse>().await else {
            continue;
        };
        if payload.playerstats.as_ref().and_then(|s| s.success) == Some(false) {
            continue;
        }
        let names = payload
            .playerstats
            .and_then(|stats| stats.achievements)
            .unwrap_or_default()
            .into_iter()
            .filter(|item| item.achieved != 0)
            .map(|item| item.apiname)
            .collect::<Vec<_>>();
        if !names.is_empty() {
            return Ok(Some(names));
        }
    }
    Ok(None)
}

fn discover_steam_ids() -> Vec<String> {
    let mut ids = Vec::new();

    for root in steam::install_roots() {
        let path = root.join("config").join("loginusers.vdf");
        if let Ok(text) = std::fs::read_to_string(path) {
            if let Some(id) = parse_most_recent_steamid(&text) {
                push_unique(&mut ids, id);
            }
            for line in text.lines() {
                let trimmed = line.trim().trim_matches('"');
                if trimmed.chars().all(|ch| ch.is_ascii_digit()) && trimmed.len() >= 16 {
                    push_unique(&mut ids, trimmed.to_string());
                }
            }
        }

        let userdata = root.join("userdata");
        let Ok(entries) = std::fs::read_dir(userdata) else {
            continue;
        };
        for entry in entries.flatten() {
            let name = entry.file_name();
            let Some(name) = name.to_str() else {
                continue;
            };
            let Ok(account_id) = name.parse::<u64>() else {
                continue;
            };
            if account_id == 0 {
                continue;
            }
            push_unique(&mut ids, (account_id + STEAM_ID64_BASE).to_string());
        }
    }

    ids
}

fn push_unique(ids: &mut Vec<String>, id: String) {
    if !ids.iter().any(|existing| existing == &id) {
        ids.push(id);
    }
}

fn parse_most_recent_steamid(text: &str) -> Option<String> {
    let mut current_id: Option<String> = None;
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('"') && trimmed.ends_with('"') && !trimmed.contains('\t') {
            let candidate = trimmed.trim_matches('"');
            if candidate.chars().all(|ch| ch.is_ascii_digit()) && candidate.len() >= 16 {
                current_id = Some(candidate.to_string());
            }
        }
        if (trimmed.contains("\"MostRecent\"") || trimmed.contains("\"mostrecent\""))
            && trimmed.contains("\"1\"")
        {
            if let Some(id) = current_id.clone() {
                return Some(id);
            }
        }
    }
    None
}

fn achievement_cache_dir(game_id: &str) -> Result<PathBuf, String> {
    let roaming = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|error| format!("resolve achievement cache root: {error}"))?;
    let dir = PathBuf::from(roaming)
        .join("SliferLauncher")
        .join("Cache")
        .join("Achievements")
        .join(sanitize_id(game_id)?);
    std::fs::create_dir_all(&dir).map_err(|error| format!("create achievement cache: {error}"))?;
    Ok(dir)
}

async fn download_icon(
    url: &Option<String>,
    dir: &Path,
    stem: &str,
) -> Result<Option<String>, String> {
    let Some(url) = url.as_deref().filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    let client = http_client()?;
    let response = match client
        .get(url)
        .header("Accept", "image/avif,image/webp,image/apng,image/*,*/*;q=0.8")
        .header("Referer", "https://steamcommunity.com/")
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => response,
        _ => return Ok(None),
    };
    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .to_string();
    let bytes = match response.bytes().await {
        Ok(bytes) if bytes.len() >= 32 => bytes,
        _ => return Ok(None),
    };
    let extension = if content_type.contains("png") || url.contains(".png") {
        "png"
    } else if content_type.contains("webp") {
        "webp"
    } else {
        "jpg"
    };
    let path = dir.join(format!("{stem}.{extension}"));
    std::fs::write(&path, bytes).map_err(|error| format!("write icon: {error}"))?;
    Ok(Some(path.to_string_lossy().replace('/', "\\")))
}

fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| format!("http client: {error}"))
}

fn xml_tag(chunk: &str, tag: &str) -> Option<String> {
    let open = format!("<{tag}>");
    let close = format!("</{tag}>");
    let start = chunk.find(&open)? + open.len();
    let end = chunk[start..].find(&close)? + start;
    let value = chunk[start..end]
        .replace("<![CDATA[", "")
        .replace("]]>", "")
        .trim()
        .to_string();
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

fn sanitize_id(id: &str) -> Result<&str, String> {
    if id.is_empty()
        || !id
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
    {
        return Err("invalid game id".into());
    }
    Ok(id)
}

fn sanitize_name(value: &str) -> String {
    value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '_'
            }
        })
        .collect()
}
