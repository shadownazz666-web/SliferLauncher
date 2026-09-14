import { create } from "zustand";
import type { SessionEnded, SessionStarted } from "@/types/library";

export interface ActivityEntry {
  id: string;
  kind: "launch" | "session" | "status";
  gameId: string;
  gameName: string;
  profileLabel: string | null;
  at: string;
  sessionSeconds?: number;
  /** Status post body when kind === "status" */
  text?: string;
}

const STORAGE_KEY = "slifer.activity";
const MAX_ENTRIES = 80;

function readEntries(): ActivityEntry[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ActivityEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: ActivityEntry[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

interface ActivityState {
  entries: ActivityEntry[];
  hydrate: () => void;
  recordLaunch: (session: SessionStarted) => void;
  recordSessionEnd: (session: SessionEnded) => void;
  postStatus: (gameId: string, gameName: string, text: string) => void;
  clear: () => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  entries: [],
  hydrate: () => set({ entries: readEntries() }),
  recordLaunch: (session) => {
    const entry: ActivityEntry = {
      id: `launch-${session.gameId}-${Date.now()}`,
      kind: "launch",
      gameId: session.gameId,
      gameName: session.gameName,
      profileLabel: session.profileLabel,
      at: new Date().toISOString(),
    };
    const entries = [entry, ...get().entries].slice(0, MAX_ENTRIES);
    writeEntries(entries);
    set({ entries });
  },
  recordSessionEnd: (session) => {
    const entry: ActivityEntry = {
      id: `session-${session.game.id}-${Date.now()}`,
      kind: "session",
      gameId: session.game.id,
      gameName: session.game.displayName?.trim() || session.game.name,
      profileLabel: null,
      at: new Date().toISOString(),
      sessionSeconds: session.sessionSeconds,
    };
    const entries = [entry, ...get().entries].slice(0, MAX_ENTRIES);
    writeEntries(entries);
    set({ entries });
  },
  postStatus: (gameId, gameName, text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const entry: ActivityEntry = {
      id: `status-${gameId}-${Date.now()}`,
      kind: "status",
      gameId,
      gameName,
      profileLabel: null,
      at: new Date().toISOString(),
      text: trimmed,
    };
    const entries = [entry, ...get().entries].slice(0, MAX_ENTRIES);
    writeEntries(entries);
    set({ entries });
  },
  clear: () => {
    writeEntries([]);
    set({ entries: [] });
  },
}));
