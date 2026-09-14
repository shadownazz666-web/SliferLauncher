export const GAME_PLATFORMS = ["Steam", "Epic", "GOG", "Custom"] as const;

export type GamePlatform = (typeof GAME_PLATFORMS)[number];

export type MetadataSource = "steamgriddb" | "steam" | "igdb" | "mixed" | "none";

export interface LaunchProfile {
  id: string;
  label: string;
  exePath: string | null;
  args: string | null;
  workingDir: string | null;
}

export interface LibraryGame {
  id: string;
  name: string;
  displayName: string | null;
  exePath: string;
  installDir: string;
  platform: GamePlatform;
  lastPlayed: string | null;
  playtimeMinutes: number;
  addedAt: string;
  collectionTag: string | null;
  description: string | null;
  coverPath: string | null;
  bannerPath: string | null;
  logoPath: string | null;
  metadataSource: string | null;
  metadataFetchedAt: string | null;
  steamAppId: number | null;
  isFavorite: boolean;
  isHidden: boolean;
  launchArgs: string | null;
  customTags: string[];
  sortIndex: number | null;
  launchProfiles: LaunchProfile[];
  defaultProfileId: string | null;
}

export type LibrarySort = "lastPlayed" | "playtime" | "name" | "dateAdded" | "custom";
export type LibraryShelf = "all" | "favorites" | "hidden";

export interface GamePreferences {
  gameId: string;
  isFavorite?: boolean;
  isHidden?: boolean;
  customTags?: string[];
  launchArgs?: string;
  collectionTag?: string;
  displayName?: string | null;
  sortIndex?: number | null;
  launchProfiles?: LaunchProfile[];
  defaultProfileId?: string | null;
}

export interface LaunchResult {
  gameId: string;
  pid: number;
  profileId: string | null;
  profileLabel: string | null;
}

export interface SessionStarted {
  gameId: string;
  gameName: string;
  steamAppId: number | null;
  pid: number;
  profileId: string | null;
  profileLabel: string | null;
}

export interface SessionEnded {
  game: LibraryGame;
  pid: number;
  sessionSeconds: number;
}

export interface ScanProgress {
  phase: string;
  message: string;
  found: number;
  saved: number;
}

export interface ScanResult {
  found: number;
  inserted: number;
  updated: number;
  games: LibraryGame[];
}

export interface RemoteArtwork {
  coverUrl: string | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  description: string | null;
  steamAppId: number | null;
  source: MetadataSource;
}
