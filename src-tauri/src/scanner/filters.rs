use crate::models::Platform;
use std::path::Path;

const NAME_EXCLUDES: &[&str] = &[
    "redistributable",
    "runtime",
    "visual c++",
    ".net",
    "directx",
    "driver",
    "hotfix",
    "update for",
    "sdk",
    "toolkit",
    "debugger",
    "microsoft edge",
    "microsoft visual",
    "windows sdk",
    "windows software",
    "webview2",
    "vcredist",
    "steamworks common",
    "steamworks shared",
    "epic online services",
    "epic games launcher",
    "gog galaxy",
    "ubisoft connect",
    "ubisoft game launcher",
    "ea app",
    "ea origin",
    "origin client",
    "origin setup",
    "battle.net",
    "xbox app",
    "xbox identity",
    "xbox game bar",
    "discord",
    "obs studio",
    "nvidia",
    "geforce",
    "amd software",
    "razer",
    "logitech",
    "icue",
    "corsair",
    "wallpaper engine",
    "rainmeter",
    "7-zip",
    "winrar",
    "python",
    "node.js",
    "git version",
    "docker",
    "visual studio",
    "vscode",
    "cursor",
    "google chrome",
    "chromium",
    "mozilla firefox",
    "microsoft teams",
    "zoom",
    "dropbox",
    "onedrive",
    "itunes",
    "vlc media",
    "win32",
    "brave",
    "opera",
    "vivaldi",
    "waterfox",
    "tor browser",
    "msedge",
    "cheat engine",
    "cheatengine",
    "process hacker",
    "processhacker",
    "wireshark",
    "fiddler",
    "notepad++",
    "notepad ++",
    "powertoys",
    "autohotkey",
    "autoit",
    "hwmonitor",
    "cpu-z",
    "gpu-z",
    "msi afterburner",
    "rtss",
    "rivatuner",
    "spotify",
    "slack",
    "telegram",
    "whatsapp",
    "skype",
    "adobe",
    "photoshop",
    "premiere",
    "illustrator",
    "acrobat",
    "handbrake",
    "streamlabs",
    "sharex",
    "lightshot",
    "everything 1.",
    "voidtools",
    "vmware",
    "virtualbox",
    "putty",
    "winscp",
    "filezilla",
    "teamviewer",
    "anydesk",
    "parsec",
    "malwarebytes",
    "norton",
    "avast",
    "avg antivirus",
    "kaspersky",
    "bitdefender",
    "windows security",
    "steelseries",
    "openjdk",
    "adoptium",
    "temurin",
    "java(tm)",
    "oracle jdk",
    "sublime text",
    "winrar",
    "bandizip",
    "ccleaner",
    "revo uninstaller",
    "speccy",
    "crystaldisk",
    "furmark",
    "prime95",
    "aida64",
    "blender",
    "obs-studio",
    "voicemeeter",
    "equalizer apo",
    "qbittorrent",
    "utorrent",
    "transmission",
    "steam setup",
    "steam client",
];

const PUBLISHER_EXCLUDES: &[&str] = &[
    "microsoft corporation",
    "microsoft windows",
    "python software foundation",
    "oracle corporation",
    "nvidia corporation",
    "advanced micro devices",
    "intel corporation",
    "realtek",
    "brave software",
    "google llc",
    "mozilla",
    "opera software",
    "voidtools",
    "cheat engine",
    "dark byte",
    "oracle america",
];

const EXE_EXCLUDES: &[&str] = &[
    "unins",
    "uninstall",
    "setup",
    "installer",
    "crash",
    "crashpad",
    "unitycrash",
    "vcredist",
    "vc_redist",
    "dxsetup",
    "redist",
    "helper",
    "update",
    "repair",
    "eac",
    "easyanticheat",
    "battleye",
    "splash",
    "overlay",
    "notification",
    "cefsharp",
    "chrome_elf",
    "crashreporter",
    "dotnet",
    "support64",
    "brave",
    "chrome",
    "firefox",
    "msedge",
    "cheatengine",
    "cheat engine",
];

const SKIP_DIRS: &[&str] = &[
    "_commonredist",
    "redist",
    "__installer",
    "support",
    "shadercache",
    ".egstore",
    ".depot",
    "webcache",
    "crashdumps",
    "node_modules",
    ".git",
    "easyanticheat",
    "battleye",
];

const GAME_PATH_MARKERS: &[&str] = &[
    "\\steamapps\\common\\",
    "\\epic games\\",
    "\\gog galaxy\\games\\",
    "\\gog games\\",
    "\\xboxgames\\",
    "\\xbox games\\",
    "\\modifiablewindowsapps\\",
    "\\ubisoft\\",
    "\\ubisoft game launcher\\games\\",
    "\\ea games\\",
    "\\electronic arts\\",
    "\\origin games\\",
    "\\battle.net\\",
    "\\riot games\\",
    "\\program files\\games\\",
    "\\program files (x86)\\games\\",
];

const EXACT_NAME_EXCLUDES: &[&str] = &[
    "launcher",
    "easyanticheat",
    "easy anti-cheat",
    "battleye",
    "crash reporter",
    "unrealcefsubprocess",
    "prereqsetup",
];

pub fn is_utility_name(name: &str) -> bool {
    let haystack = name.to_ascii_lowercase();
    EXACT_NAME_EXCLUDES.iter().any(|needle| haystack == *needle)
        || NAME_EXCLUDES.iter().any(|needle| haystack.contains(needle))
}

pub fn is_utility_publisher(publisher: &str) -> bool {
    let haystack = publisher.to_ascii_lowercase();
    PUBLISHER_EXCLUDES
        .iter()
        .any(|needle| haystack.contains(needle))
}

pub fn is_excluded_exe(path: &Path) -> bool {
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    EXE_EXCLUDES.iter().any(|needle| stem.contains(needle))
}

pub fn should_skip_dir(name: &str) -> bool {
    let haystack = name.to_ascii_lowercase();
    SKIP_DIRS.iter().any(|needle| haystack == *needle)
}

pub fn is_system_install_dir(path: &Path) -> bool {
    let value = path.to_string_lossy().to_ascii_lowercase();
    value.contains("\\windows\\")
        || value.ends_with("\\windows")
        || value.contains("\\program files\\common files")
        || value.contains("\\program files (x86)\\common files")
}

pub fn looks_like_launcher_folder(name: &str) -> bool {
    matches!(
        name.to_ascii_lowercase().as_str(),
        "steam"
            | "steamapps"
            | "epic games"
            | "epicgameslauncher"
            | "gog galaxy"
            | "ubisoft game launcher"
            | "xbox games"
    )
}

pub fn is_game_library_path(path: &Path) -> bool {
    let value = path.to_string_lossy().to_ascii_lowercase().replace('/', "\\");
    GAME_PATH_MARKERS.iter().any(|marker| value.contains(marker))
        || value.contains("\\games\\")
}

pub fn is_steam_uninstall_key(key_name: &str) -> bool {
    key_name
        .to_ascii_lowercase()
        .starts_with("steam app ")
}

pub fn steam_app_id_from_uninstall_key(key_name: &str) -> Option<i64> {
    key_name
        .strip_prefix("Steam App ")
        .or_else(|| key_name.strip_prefix("steam app "))
        .and_then(|value| value.trim().parse().ok())
}

pub fn should_keep_library_game(name: &str, platform: Platform, install_dir: &str) -> bool {
    if is_utility_name(name) {
        return false;
    }
    match platform {
        Platform::Steam | Platform::Epic | Platform::GOG => true,
        Platform::Custom => is_game_library_path(Path::new(install_dir)),
    }
}
