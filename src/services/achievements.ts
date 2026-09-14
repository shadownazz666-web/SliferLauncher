import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/lib/runtime";
import type {
  AchievementSummary,
  AchievementSyncResult,
  AchievementView,
} from "@/types/achievements";

export async function listGameAchievements(gameId: string): Promise<AchievementView[]> {
  if (!isTauriRuntime()) {
    return [];
  }
  return invoke<AchievementView[]>("list_game_achievements", { gameId });
}

export async function syncGameAchievements(gameId: string): Promise<AchievementSyncResult> {
  if (!isTauriRuntime()) {
    throw new Error("Achievement sync requires the Slifer desktop app");
  }
  return invoke<AchievementSyncResult>("sync_game_achievements", { gameId });
}

export async function setAchievementUnlocked(
  gameId: string,
  apiName: string,
  unlocked: boolean,
): Promise<AchievementView> {
  if (!isTauriRuntime()) {
    throw new Error("Updating achievements requires the Slifer desktop app");
  }
  return invoke<AchievementView>("set_achievement_unlocked", {
    gameId,
    apiName,
    unlocked,
  });
}

export async function getAchievementSummary(gameId: string): Promise<AchievementSummary> {
  if (!isTauriRuntime()) {
    return { gameId, total: 0, unlocked: 0 };
  }
  return invoke<AchievementSummary>("get_achievement_summary", { gameId });
}
