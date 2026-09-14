//! Soft Game Booster: suspend common browsers and drop Slifer process priority while a game runs.

use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

pub const BOOSTER_ENGAGED_EVENT: &str = "game-booster-engaged";
pub const BOOSTER_DISENGAGED_EVENT: &str = "game-booster-disengaged";

static SUSPENDED: Mutex<Vec<u32>> = Mutex::new(Vec::new());

const BROWSER_NAMES: &[&str] = &[
    "chrome.exe",
    "msedge.exe",
    "firefox.exe",
    "brave.exe",
    "opera.exe",
    "vivaldi.exe",
];

pub fn engage(app: &AppHandle) {
    let mut suspended = match SUSPENDED.lock() {
        Ok(guard) => guard,
        Err(_) => return,
    };
    if !suspended.is_empty() {
        return;
    }

    #[cfg(windows)]
    {
        lower_own_priority();
        for pid in browser_pids() {
            if suspend_pid(pid) {
                suspended.push(pid);
            }
        }
    }

    let _ = app.emit(BOOSTER_ENGAGED_EVENT, suspended.len());
}

pub fn disengage(app: &AppHandle) {
    let mut suspended = match SUSPENDED.lock() {
        Ok(guard) => guard,
        Err(_) => return,
    };

    #[cfg(windows)]
    {
        for pid in suspended.drain(..) {
            let _ = resume_pid(pid);
        }
        restore_own_priority();
    }

    #[cfg(not(windows))]
    {
        suspended.clear();
    }

    let _ = app.emit(BOOSTER_DISENGAGED_EVENT, true);
}

#[cfg(windows)]
fn browser_pids() -> Vec<u32> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let output = Command::new("tasklist")
        .args(["/FO", "CSV", "/NH"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    let Ok(output) = output else {
        return Vec::new();
    };
    let text = String::from_utf8_lossy(&output.stdout);
    let mut pids = Vec::new();
    for line in text.lines() {
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() < 2 {
            continue;
        }
        let name = parts[0].trim().trim_matches('"').to_ascii_lowercase();
        if !BROWSER_NAMES.iter().any(|browser| *browser == name) {
            continue;
        }
        let pid_raw = parts[1].trim().trim_matches('"');
        if let Ok(pid) = pid_raw.parse::<u32>() {
            pids.push(pid);
        }
    }
    pids.sort_unstable();
    pids.dedup();
    pids
}

#[cfg(windows)]
fn suspend_pid(pid: u32) -> bool {
    unsafe {
        let handle = OpenProcess(PROCESS_SUSPEND_RESUME, 0, pid);
        if handle.is_null() {
            return false;
        }
        let status = NtSuspendProcess(handle);
        let _ = CloseHandle(handle);
        status == 0
    }
}

#[cfg(windows)]
fn resume_pid(pid: u32) -> bool {
    unsafe {
        let handle = OpenProcess(PROCESS_SUSPEND_RESUME, 0, pid);
        if handle.is_null() {
            return false;
        }
        let status = NtResumeProcess(handle);
        let _ = CloseHandle(handle);
        status == 0
    }
}

#[cfg(windows)]
fn lower_own_priority() {
    unsafe {
        let process = GetCurrentProcess();
        let _ = SetPriorityClass(process, BELOW_NORMAL_PRIORITY_CLASS);
    }
}

#[cfg(windows)]
fn restore_own_priority() {
    unsafe {
        let process = GetCurrentProcess();
        let _ = SetPriorityClass(process, NORMAL_PRIORITY_CLASS);
    }
}

#[cfg(windows)]
const PROCESS_SUSPEND_RESUME: u32 = 0x0800;
#[cfg(windows)]
const BELOW_NORMAL_PRIORITY_CLASS: u32 = 0x0000_4000;
#[cfg(windows)]
const NORMAL_PRIORITY_CLASS: u32 = 0x0000_0020;

#[cfg(windows)]
#[link(name = "ntdll")]
unsafe extern "system" {
    fn NtSuspendProcess(process_handle: *mut std::ffi::c_void) -> i32;
    fn NtResumeProcess(process_handle: *mut std::ffi::c_void) -> i32;
}

#[cfg(windows)]
#[link(name = "kernel32")]
unsafe extern "system" {
    fn OpenProcess(access: u32, inherit: i32, pid: u32) -> *mut std::ffi::c_void;
    fn CloseHandle(handle: *mut std::ffi::c_void) -> i32;
    fn GetCurrentProcess() -> *mut std::ffi::c_void;
    fn SetPriorityClass(process: *mut std::ffi::c_void, class: u32) -> i32;
}
