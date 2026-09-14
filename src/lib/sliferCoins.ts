/** Slifer Coins economy — intentionally slow until real monetization exists. */

export const COIN_NAME = "Slifer Coins";
export const COIN_SHORT = "SC";

/** Coins awarded when a game is launched through Slifer. */
export const LAUNCH_REWARD = 5;
/** Max launch rewards that grant coins per UTC day. */
export const LAUNCH_REWARDS_PER_DAY = 3;

/** Coins for staying active in the client. */
export const IDLE_REWARD = 1;
/** Minutes of open client time between idle rewards. */
export const IDLE_MINUTES = 20;
/** Max idle rewards per UTC day. */
export const IDLE_REWARDS_PER_DAY = 6;

/**
 * Coins for a finished play session: 1 SC per this many minutes, rounded down.
 * Long sessions still only count once at session end.
 */
export const PLAY_MINUTES_PER_COIN = 45;
/** Cap coins from a single session. */
export const PLAY_REWARD_PER_SESSION_CAP = 3;
/** Max play-session coin grants per UTC day. */
export const PLAY_REWARDS_PER_DAY = 4;

export function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function formatCoins(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.max(0, Number(amount) || 0));
}

export function playSessionReward(sessionSeconds: number): number {
  const minutes = Math.max(0, Math.floor(sessionSeconds / 60));
  const raw = Math.floor(minutes / PLAY_MINUTES_PER_COIN);
  return Math.min(PLAY_REWARD_PER_SESSION_CAP, raw);
}
