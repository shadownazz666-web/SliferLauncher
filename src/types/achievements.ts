export interface AchievementView {
  id: string;
  gameId: string;
  apiName: string;
  displayName: string;
  description: string | null;
  iconPath: string | null;
  iconLockedPath: string | null;
  hidden: boolean;
  sortOrder: number;
  source: string;
  globalPercent?: number | null;
  unlocked: boolean;
  unlockedAt: string | null;
  unlockSource: string | null;
}

export interface AchievementSummary {
  gameId: string;
  total: number;
  unlocked: number;
}

export interface AchievementSyncResult {
  gameId: string;
  importedDefs: number;
  importedUnlocks: number;
  achievements: AchievementView[];
  message: string | null;
}

/** Rare / tough achievements get the golden cinder aura. */
export function isToughAchievement(item: AchievementView): boolean {
  if (item.source === "slifer") {
    return item.apiName === "slifer_ten_hours";
  }
  if (item.globalPercent != null && item.globalPercent <= 5) {
    return true;
  }
  return item.hidden;
}
