import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { isTauriRuntime } from "@/lib/runtime";
import type {
  GamePreferences,
  LaunchResult,
  LibraryGame,
  SessionEnded,
  SessionStarted,
} from "@/types/library";

export const SESSION_STARTED_EVENT = "game-session-started";
export const SESSION_ENDED_EVENT = "game-session-ended";

export async function launchGame(
  gameId: string,
  profileId?: string | null,
  boosterEnabled = false,
): Promise<LaunchResult> {
  if (!isTauriRuntime()) {
    throw new Error("Launching requires the Slifer desktop app");
  }
  return invoke<LaunchResult>("launch_game", {
    gameId,
    profileId: profileId ?? null,
    boosterEnabled,
  });
}

export async function updateGamePreferences(
  prefs: GamePreferences,
): Promise<LibraryGame> {
  if (!isTauriRuntime()) {
    throw new Error("Saving preferences requires the Slifer desktop app");
  }
  return invoke<LibraryGame>("update_game_preferences", { prefs });
}

export async function listRunningGames(): Promise<string[]> {
  if (!isTauriRuntime()) {
    return [];
  }
  return invoke<string[]>("list_running_games");
}

export async function listenToSessionStarted(
  onStart: (session: SessionStarted) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return () => undefined;
  }
  return listen<SessionStarted>(SESSION_STARTED_EVENT, (event) => {
    onStart(event.payload);
  });
}

export async function listenToSessionEnded(
  onEnd: (session: SessionEnded) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return () => undefined;
  }
  return listen<SessionEnded>(SESSION_ENDED_EVENT, (event) => {
    onEnd(event.payload);
  });
}
