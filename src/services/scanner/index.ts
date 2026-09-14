import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { isTauriRuntime } from "@/lib/runtime";
import type { LibraryGame, ScanProgress, ScanResult } from "@/types/library";

export const SCAN_PROGRESS_EVENT = "game-scan-progress";
export const SCAN_COMPLETE_EVENT = "game-scan-complete";

export async function listLibraryGames(): Promise<LibraryGame[]> {
  if (!isTauriRuntime()) {
    return [];
  }
  return invoke<LibraryGame[]>("list_library_games");
}

export async function scanForInstalledGames(): Promise<ScanResult> {
  if (!isTauriRuntime()) {
    return { found: 0, inserted: 0, updated: 0, games: [] };
  }
  return invoke<ScanResult>("scan_for_installed_games");
}

export async function addManualGame(): Promise<LibraryGame | null> {
  if (!isTauriRuntime()) {
    throw new Error("Adding a game requires the desktop app");
  }
  return invoke<LibraryGame | null>("add_manual_game");
}

export async function listenToScanProgress(
  onProgress: (progress: ScanProgress) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return () => undefined;
  }
  return listen<ScanProgress>(SCAN_PROGRESS_EVENT, (event) => {
    onProgress(event.payload);
  });
}

export async function listenToScanComplete(
  onComplete: (result: ScanResult) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return () => undefined;
  }
  return listen<ScanResult>(SCAN_COMPLETE_EVENT, (event) => {
    onComplete(event.payload);
  });
}
