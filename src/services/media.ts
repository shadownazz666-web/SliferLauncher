import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/lib/runtime";

export interface MediaItem {
  id: string;
  gameId: string;
  path: string;
  kind: string;
  createdAt: number;
}

export async function listGameMedia(gameId: string): Promise<MediaItem[]> {
  if (!isTauriRuntime()) {
    return [];
  }
  return invoke<MediaItem[]>("list_game_media", { gameId });
}

export async function captureGameScreenshot(gameId: string): Promise<MediaItem> {
  if (!isTauriRuntime()) {
    throw new Error("Screenshots require the Slifer desktop app");
  }
  return invoke<MediaItem>("capture_game_screenshot", { gameId });
}

export async function toggleMainWindowVisible(): Promise<boolean> {
  if (!isTauriRuntime()) {
    return true;
  }
  return invoke<boolean>("toggle_main_window_visible");
}
