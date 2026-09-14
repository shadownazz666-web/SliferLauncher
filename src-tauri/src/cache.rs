use crate::db::Database;
use crate::models::{ArtworkCacheRequest, LibraryGame};
use reqwest::header::CONTENT_TYPE;
use std::path::{Path, PathBuf};
use std::time::Duration;

const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const STEAM_COVERS: &[&str] = &[
    "library_600x900.jpg",
    "library_capsule.jpg",
    "header.jpg",
    "capsule_616x353.jpg",
    "capsule_231x87.jpg",
];
const STEAM_BANNERS: &[&str] = &["library_hero.jpg", "header.jpg", "capsule_616x353.jpg"];

pub fn art_cache_dir() -> Result<PathBuf, String> {
    let roaming = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|error| format!("resolve cache root: {error}"))?;
    let dir = PathBuf::from(roaming)
        .join("SliferLauncher")
        .join("Cache")
        .join("Art");
    std::fs::create_dir_all(&dir).map_err(|error| format!("create art cache: {error}"))?;
    Ok(dir)
}

pub async fn cache_game_artwork(
    db: &Database,
    request: ArtworkCacheRequest,
) -> Result<LibraryGame, String> {
    let game_id = sanitize_id(&request.game_id)?;
    let game_dir = art_cache_dir()?.join(game_id);
    std::fs::create_dir_all(&game_dir).map_err(|error| format!("create game art dir: {error}"))?;

    let mut cover_path = download_named(&request.cover_url, &game_dir, "cover").await?;
    let mut banner_path = download_named(&request.banner_url, &game_dir, "banner").await?;
    let logo_path = download_named(&request.logo_url, &game_dir, "logo").await?;

    if let Some(app_id) = request.steam_app_id.filter(|id| *id > 0) {
        if cover_path.is_none() {
            cover_path = download_steam_files(app_id, STEAM_COVERS, &game_dir, "cover").await?;
        }
        if banner_path.is_none() {
            banner_path = download_steam_files(app_id, STEAM_BANNERS, &game_dir, "banner").await?;
        }
    }

    db.update_metadata(
        game_id,
        request.description.as_deref(),
        cover_path.as_deref(),
        banner_path.as_deref(),
        logo_path.as_deref(),
        request.metadata_source.as_deref(),
        request.steam_app_id,
    )?;

    db.get_game(game_id)
        .and_then(|game| game.ok_or_else(|| format!("game {game_id} missing after metadata save")))
}

async fn download_named(
    url: &Option<String>,
    dir: &Path,
    stem: &str,
) -> Result<Option<String>, String> {
    let Some(url) = url.as_deref().filter(|value| !value.is_empty()) else {
        return Ok(None);
    };

    let client = reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| format!("http client: {error}"))?;

    let response = match client
        .get(url)
        .header("Accept", "image/avif,image/webp,image/apng,image/*,*/*;q=0.8")
        .header("Referer", "https://store.steampowered.com/")
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
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("read {stem}: {error}"))?;

    if bytes.len() < 32 || !looks_like_image(&bytes) {
        return Ok(None);
    }

    let extension = extension_for(&content_type, url);
    let path = dir.join(format!("{stem}.{extension}"));
    std::fs::write(&path, bytes).map_err(|error| format!("write {stem}: {error}"))?;
    Ok(Some(path.to_string_lossy().replace('/', "\\")))
}

async fn download_steam_files(
    app_id: i64,
    files: &[&str],
    dir: &Path,
    stem: &str,
) -> Result<Option<String>, String> {
    for host in [
        "https://cdn.cloudflare.steamstatic.com/steam/apps",
        "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps",
        "https://steamcdn-a.akamaihd.net/steam/apps",
    ] {
        for file in files {
            let url = format!("{host}/{app_id}/{file}");
            if let Some(path) = download_named(&Some(url), dir, stem).await? {
                return Ok(Some(path));
            }
        }
    }
    Ok(None)
}

fn looks_like_image(bytes: &[u8]) -> bool {
    bytes.starts_with(&[0xFF, 0xD8, 0xFF])
        || bytes.starts_with(&[0x89, b'P', b'N', b'G'])
        || bytes.starts_with(b"GIF8")
        || bytes.starts_with(b"RIFF")
}

fn extension_for(content_type: &str, url: &str) -> &'static str {
    let mime = content_type
        .split(';')
        .next()
        .unwrap_or("")
        .trim()
        .to_ascii_lowercase();
    match mime.as_str() {
        "image/png" => "png",
        "image/webp" => "webp",
        "image/gif" => "gif",
        "image/jpeg" | "image/jpg" => "jpg",
        _ => {
            let lowered = url.to_ascii_lowercase();
            if lowered.contains(".png") {
                "png"
            } else if lowered.contains(".webp") {
                "webp"
            } else if lowered.contains(".gif") {
                "gif"
            } else {
                "jpg"
            }
        }
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
