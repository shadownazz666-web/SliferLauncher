use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

pub const OVERLAY_TOGGLE_EVENT: &str = "slifer-overlay-toggle";
const OVERLAY_LABEL: &str = "overlay";

static HOTKEY_RUNNING: AtomicBool = AtomicBool::new(false);

pub fn ensure_overlay_window(app: &AppHandle) -> Result<(), String> {
    if app.get_webview_window(OVERLAY_LABEL).is_some() {
        return Ok(());
    }

    let window = WebviewWindowBuilder::new(
        app,
        OVERLAY_LABEL,
        WebviewUrl::App("index.html#/overlay".into()),
    )
    .title("Slifer Overlay")
    .fullscreen(true)
    .always_on_top(true)
    .decorations(false)
    .transparent(true)
    .visible(false)
    .skip_taskbar(true)
    .focused(false)
    .build()
    .map_err(|error| format!("create overlay window: {error}"))?;

    crate::apply_liquid_glass_pub(&window);
    Ok(())
}

pub fn toggle_overlay(app: &AppHandle) -> Result<bool, String> {
    ensure_overlay_window(app)?;
    let window = app
        .get_webview_window(OVERLAY_LABEL)
        .ok_or_else(|| "overlay window missing".to_string())?;
    let visible = window
        .is_visible()
        .map_err(|error| format!("overlay visible: {error}"))?;
    if visible {
        window
            .hide()
            .map_err(|error| format!("hide overlay: {error}"))?;
        Ok(false)
    } else {
        window
            .show()
            .map_err(|error| format!("show overlay: {error}"))?;
        window
            .set_focus()
            .map_err(|error| format!("focus overlay: {error}"))?;
        let _ = app.emit(OVERLAY_TOGGLE_EVENT, true);
        Ok(true)
    }
}

pub fn hide_overlay(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
        let _ = window.hide();
    }
}

pub fn start_hotkey_watcher(app: AppHandle) {
    if HOTKEY_RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }

    thread::spawn(move || {
        #[cfg(windows)]
        {
            use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
                GetAsyncKeyState, VK_SHIFT, VK_TAB,
            };

            let mut was_down = false;
            loop {
                let shift = unsafe { GetAsyncKeyState(VK_SHIFT as i32) } as u16 & 0x8000 != 0;
                let tab = unsafe { GetAsyncKeyState(VK_TAB as i32) } as u16 & 0x8000 != 0;
                let down = shift && tab;
                if down && !was_down {
                    // Only toggle when a game session is tracked.
                    if let Some(tracker) = app.try_state::<crate::launch::SessionTracker>() {
                        if !tracker.running_ids().is_empty() {
                            let _ = toggle_overlay(&app);
                        }
                    }
                }
                was_down = down;
                thread::sleep(Duration::from_millis(40));
            }
        }

        #[cfg(not(windows))]
        {
            let _ = app;
            loop {
                thread::sleep(Duration::from_secs(60));
            }
        }
    });
}
