use crate::models::MediaItem;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub fn media_root() -> Result<PathBuf, String> {
    let roaming = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|error| format!("resolve media root: {error}"))?;
    let dir = PathBuf::from(roaming).join("SliferLauncher").join("Media");
    std::fs::create_dir_all(&dir).map_err(|error| format!("create media root: {error}"))?;
    Ok(dir)
}

pub fn game_media_dir(game_id: &str) -> Result<PathBuf, String> {
    let dir = media_root()?.join(sanitize_id(game_id)?);
    std::fs::create_dir_all(&dir).map_err(|error| format!("create game media dir: {error}"))?;
    Ok(dir)
}

pub fn list_media(game_id: &str) -> Result<Vec<MediaItem>, String> {
    let dir = game_media_dir(game_id)?;
    let mut items = Vec::new();
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return Ok(items);
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
            continue;
        };
        let lower = name.to_ascii_lowercase();
        let kind = if lower.ends_with(".png")
            || lower.ends_with(".jpg")
            || lower.ends_with(".jpeg")
            || lower.ends_with(".webp")
            || lower.ends_with(".bmp")
        {
            "image"
        } else if lower.ends_with(".mp4") || lower.ends_with(".webm") {
            "clip"
        } else {
            continue;
        };
        let meta = entry.metadata().ok();
        let modified = meta
            .and_then(|value| value.modified().ok())
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_secs() as i64)
            .unwrap_or(0);
        items.push(MediaItem {
            id: format!("{game_id}:{name}"),
            game_id: game_id.to_string(),
            path: path.to_string_lossy().replace('/', "\\"),
            kind: kind.to_string(),
            created_at: modified,
        });
    }
    items.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(items)
}

pub fn capture_screenshot(game_id: &str) -> Result<MediaItem, String> {
    let dir = game_media_dir(game_id)?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis())
        .unwrap_or(0);
    let path = dir.join(format!("capture-{stamp}.bmp"));
    capture_primary_monitor(&path)?;
    Ok(MediaItem {
        id: format!("{game_id}:capture-{stamp}.bmp"),
        game_id: game_id.to_string(),
        path: path.to_string_lossy().replace('/', "\\"),
        kind: "image".into(),
        created_at: (stamp / 1000) as i64,
    })
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

#[cfg(windows)]
fn capture_primary_monitor(path: &Path) -> Result<(), String> {
    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::Graphics::Gdi::{
        BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC,
        GetDIBits, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
        SRCCOPY,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};

    unsafe {
        let width = GetSystemMetrics(SM_CXSCREEN);
        let height = GetSystemMetrics(SM_CYSCREEN);
        if width <= 0 || height <= 0 {
            return Err("invalid screen size".into());
        }

        let screen_dc = GetDC(HWND::default());
        if screen_dc.is_null() {
            return Err("GetDC failed".into());
        }
        let mem_dc = CreateCompatibleDC(screen_dc);
        let bitmap = CreateCompatibleBitmap(screen_dc, width, height);
        if mem_dc.is_null() || bitmap.is_null() {
            if !mem_dc.is_null() {
                DeleteDC(mem_dc);
            }
            if !bitmap.is_null() {
                DeleteObject(bitmap as _);
            }
            ReleaseDC(HWND::default(), screen_dc);
            return Err("create capture surface failed".into());
        }

        let old = SelectObject(mem_dc, bitmap as _);
        let ok = BitBlt(mem_dc, 0, 0, width, height, screen_dc, 0, 0, SRCCOPY);
        SelectObject(mem_dc, old);
        if ok == 0 {
            DeleteObject(bitmap as _);
            DeleteDC(mem_dc);
            ReleaseDC(HWND::default(), screen_dc);
            return Err("BitBlt failed".into());
        }

        let mut info = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width,
                biHeight: -height,
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB,
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [std::mem::zeroed()],
        };

        let stride = (width * 4) as usize;
        let mut pixels = vec![0u8; stride * height as usize];
        let copied = GetDIBits(
            mem_dc,
            bitmap,
            0,
            height as u32,
            pixels.as_mut_ptr() as _,
            &mut info,
            DIB_RGB_COLORS,
        );

        DeleteObject(bitmap as _);
        DeleteDC(mem_dc);
        ReleaseDC(HWND::default(), screen_dc);

        if copied == 0 {
            return Err("GetDIBits failed".into());
        }

        write_bmp(path, width as u32, height as u32, &pixels)
    }
}

#[cfg(windows)]
fn write_bmp(path: &Path, width: u32, height: u32, bgra: &[u8]) -> Result<(), String> {
    let pixel_size = bgra.len();
    let file_size = 54 + pixel_size;
    let mut out = Vec::with_capacity(file_size);
    out.extend_from_slice(b"BM");
    out.extend_from_slice(&(file_size as u32).to_le_bytes());
    out.extend_from_slice(&0u32.to_le_bytes());
    out.extend_from_slice(&54u32.to_le_bytes());
    out.extend_from_slice(&40u32.to_le_bytes());
    out.extend_from_slice(&width.to_le_bytes());
    out.extend_from_slice(&(-(height as i32)).to_le_bytes());
    out.extend_from_slice(&1u16.to_le_bytes());
    out.extend_from_slice(&32u16.to_le_bytes());
    out.extend_from_slice(&0u32.to_le_bytes());
    out.extend_from_slice(&(pixel_size as u32).to_le_bytes());
    out.extend_from_slice(&0u32.to_le_bytes());
    out.extend_from_slice(&0u32.to_le_bytes());
    out.extend_from_slice(&0u32.to_le_bytes());
    out.extend_from_slice(&0u32.to_le_bytes());
    out.extend_from_slice(bgra);
    std::fs::write(path, out).map_err(|error| format!("write bmp: {error}"))
}

#[cfg(not(windows))]
fn capture_primary_monitor(path: &Path) -> Result<(), String> {
    let _ = path;
    Err("Screen capture is only available on Windows".into())
}
