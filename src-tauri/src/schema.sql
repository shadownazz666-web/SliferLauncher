CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    exe_path TEXT NOT NULL UNIQUE,
    install_dir TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('Steam', 'Epic', 'GOG', 'Custom')),
    last_played TEXT,
    playtime_minutes INTEGER NOT NULL DEFAULT 0,
    added_at TEXT NOT NULL,
    collection_tag TEXT,
    description TEXT,
    cover_path TEXT,
    banner_path TEXT,
    logo_path TEXT,
    metadata_source TEXT,
    metadata_fetched_at TEXT,
    steam_app_id INTEGER,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    is_hidden INTEGER NOT NULL DEFAULT 0,
    launch_args TEXT,
    custom_tags TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_games_platform ON games(platform);
CREATE INDEX IF NOT EXISTS idx_games_name ON games(name);

CREATE TABLE IF NOT EXISTS achievement_defs (
    id TEXT PRIMARY KEY NOT NULL,
    game_id TEXT NOT NULL,
    api_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    icon_path TEXT,
    icon_locked_path TEXT,
    hidden INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'manual',
    global_percent REAL,
    UNIQUE (game_id, api_name)
);

CREATE INDEX IF NOT EXISTS idx_achievement_defs_game ON achievement_defs(game_id);

CREATE TABLE IF NOT EXISTS achievement_unlocks (
    game_id TEXT NOT NULL,
    api_name TEXT NOT NULL,
    unlocked_at TEXT,
    unlock_source TEXT NOT NULL DEFAULT 'manual',
    PRIMARY KEY (game_id, api_name)
);

CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_game ON achievement_unlocks(game_id);
