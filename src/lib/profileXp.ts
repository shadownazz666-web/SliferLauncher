/** 100 XP per hour of recorded playtime. */
export const XP_PER_HOUR = 100;
export const XP_PER_LEVEL = 100;

export function playtimeXp(playtimeMinutes: number): number {
  return Math.max(0, Math.floor((playtimeMinutes / 60) * XP_PER_HOUR));
}

export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

export function xpIntoLevel(xp: number): number {
  return ((xp % XP_PER_LEVEL) + XP_PER_LEVEL) % XP_PER_LEVEL;
}

/** Ring / badge color changes every 10 levels. */
const LEVEL_RING_COLORS = [
  "#b7aea3", // 1–10
  "#e11d2e", // 11–20
  "#ff3b4e", // 21–30
  "#e8c36a", // 31–40
  "#4ade80", // 41–50
  "#38bdf8", // 51–60
  "#a78bfa", // 61–70
  "#f472b6", // 71–80
  "#fb923c", // 81–90
  "#f8fafc", // 91+
] as const;

export function levelRingColor(level: number): string {
  const tier = Math.max(0, Math.floor((Math.max(1, level) - 1) / 10));
  return LEVEL_RING_COLORS[Math.min(tier, LEVEL_RING_COLORS.length - 1)]!;
}
