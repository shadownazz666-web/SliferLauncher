import { create } from "zustand";
import {
  IDLE_MINUTES,
  IDLE_REWARD,
  IDLE_REWARDS_PER_DAY,
  LAUNCH_REWARD,
  LAUNCH_REWARDS_PER_DAY,
  PLAY_REWARDS_PER_DAY,
  playSessionReward,
  utcDayKey,
} from "@/lib/sliferCoins";

const WALLET_KEY = "slifer.wallet.v2";
const MAX_TX = 80;

export type WalletTxKind = "earn" | "spend";

export interface WalletTransaction {
  id: string;
  kind: WalletTxKind;
  amount: number;
  at: string;
  /** Short label, e.g. "Launched Resident Evil 4" or product name for spends. */
  label: string;
  productName?: string;
}

interface DailyCaps {
  day: string;
  launches: number;
  idle: number;
  play: number;
}

interface WalletPersisted {
  balance: number;
  transactions: WalletTransaction[];
  daily: DailyCaps;
  /** Accumulated ms of client presence toward next idle reward. */
  idleProgressMs: number;
}

interface WalletState extends WalletPersisted {
  hydrate: () => void;
  /** Award launch coins if under daily cap. Returns awarded amount. */
  rewardLaunch: (gameName: string) => number;
  /** Tick client presence; may award idle coins. */
  tickIdlePresence: (deltaMs: number) => number;
  /** Award playtime coins when a session ends. */
  rewardPlaySession: (gameName: string, sessionSeconds: number) => number;
  /** Spend coins on a store product. Returns false if insufficient. */
  spend: (productName: string, cost: number) => boolean;
}

function emptyDaily(day = utcDayKey()): DailyCaps {
  return { day, launches: 0, idle: 0, play: 0 };
}

function defaultState(): WalletPersisted {
  return {
    balance: 0,
    transactions: [],
    daily: emptyDaily(),
    idleProgressMs: 0,
  };
}

function readPersisted(): WalletPersisted {
  if (typeof window === "undefined") {
    return defaultState();
  }
  try {
    const raw = window.localStorage.getItem(WALLET_KEY);
    if (!raw) {
      // Migrate old USD balance key once — treat as 0 coins (currency change).
      window.localStorage.removeItem("slifer.walletBalance");
      return defaultState();
    }
    const parsed = JSON.parse(raw) as Partial<WalletPersisted>;
    const day = utcDayKey();
    const daily =
      parsed.daily?.day === day ? parsed.daily : emptyDaily(day);
    return {
      balance: Math.max(0, Math.floor(Number(parsed.balance) || 0)),
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions.slice(0, MAX_TX) : [],
      daily,
      idleProgressMs: Math.max(0, Number(parsed.idleProgressMs) || 0),
    };
  } catch {
    return defaultState();
  }
}

function writePersisted(state: WalletPersisted): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    WALLET_KEY,
    JSON.stringify({
      balance: state.balance,
      transactions: state.transactions.slice(0, MAX_TX),
      daily: state.daily,
      idleProgressMs: state.idleProgressMs,
    }),
  );
}

function ensureDay(daily: DailyCaps): DailyCaps {
  const day = utcDayKey();
  return daily.day === day ? daily : emptyDaily(day);
}

function pushEarn(
  state: WalletPersisted,
  amount: number,
  label: string,
): WalletPersisted {
  if (amount <= 0) {
    return state;
  }
  const tx: WalletTransaction = {
    id: `earn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "earn",
    amount,
    at: new Date().toISOString(),
    label,
  };
  return {
    ...state,
    balance: state.balance + amount,
    transactions: [tx, ...state.transactions].slice(0, MAX_TX),
  };
}

export const useWalletStore = create<WalletState>((set, get) => ({
  ...defaultState(),
  hydrate: () => {
    const next = readPersisted();
    set(next);
  },
  rewardLaunch: (gameName) => {
    const current = get();
    const daily = ensureDay(current.daily);
    if (daily.launches >= LAUNCH_REWARDS_PER_DAY) {
      if (daily !== current.daily) {
        const synced = { ...current, daily, idleProgressMs: current.idleProgressMs };
        writePersisted(synced);
        set(synced);
      }
      return 0;
    }
    const next = pushEarn(
      { ...current, daily: { ...daily, launches: daily.launches + 1 } },
      LAUNCH_REWARD,
      `Launched ${gameName.trim() || "a game"}`,
    );
    writePersisted(next);
    set(next);
    return LAUNCH_REWARD;
  },
  tickIdlePresence: (deltaMs) => {
    if (deltaMs <= 0) {
      return 0;
    }
    const current = get();
    const daily = ensureDay(current.daily);
    if (daily.idle >= IDLE_REWARDS_PER_DAY) {
      const synced = { ...current, daily, idleProgressMs: 0 };
      if (synced.daily !== current.daily || current.idleProgressMs !== 0) {
        writePersisted(synced);
        set(synced);
      }
      return 0;
    }
    const needMs = IDLE_MINUTES * 60 * 1000;
    let progress = current.idleProgressMs + deltaMs;
    let awarded = 0;
    let idleCount = daily.idle;
    let balance = current.balance;
    let transactions = current.transactions;

    while (progress >= needMs && idleCount < IDLE_REWARDS_PER_DAY) {
      progress -= needMs;
      idleCount += 1;
      awarded += IDLE_REWARD;
      const tx: WalletTransaction = {
        id: `earn-${Date.now()}-${idleCount}`,
        kind: "earn",
        amount: IDLE_REWARD,
        at: new Date().toISOString(),
        label: "Active in Slifer",
      };
      balance += IDLE_REWARD;
      transactions = [tx, ...transactions].slice(0, MAX_TX);
    }

    const next: WalletPersisted = {
      balance,
      transactions,
      daily: { ...daily, idle: idleCount },
      idleProgressMs: progress,
    };
    writePersisted(next);
    set(next);
    return awarded;
  },
  rewardPlaySession: (gameName, sessionSeconds) => {
    const amount = playSessionReward(sessionSeconds);
    if (amount <= 0) {
      return 0;
    }
    const current = get();
    const daily = ensureDay(current.daily);
    if (daily.play >= PLAY_REWARDS_PER_DAY) {
      if (daily !== current.daily) {
        const synced = { ...current, daily };
        writePersisted(synced);
        set(synced);
      }
      return 0;
    }
    const next = pushEarn(
      { ...current, daily: { ...daily, play: daily.play + 1 } },
      amount,
      `Played ${gameName.trim() || "a game"}`,
    );
    writePersisted(next);
    set(next);
    return amount;
  },
  spend: (productName, cost) => {
    const price = Math.max(0, Math.floor(cost));
    const current = get();
    if (price <= 0 || current.balance < price) {
      return false;
    }
    const name = productName.trim() || "Store item";
    const tx: WalletTransaction = {
      id: `spend-${Date.now()}`,
      kind: "spend",
      amount: price,
      at: new Date().toISOString(),
      label: `Purchased ${name}`,
      productName: name,
    };
    const next: WalletPersisted = {
      ...current,
      daily: ensureDay(current.daily),
      balance: current.balance - price,
      transactions: [tx, ...current.transactions].slice(0, MAX_TX),
    };
    writePersisted(next);
    set(next);
    return true;
  },
}));
