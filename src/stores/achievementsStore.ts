import { create } from "zustand";
import {
  getAchievementSummary,
  listGameAchievements,
  setAchievementUnlocked,
  syncGameAchievements,
} from "@/services/achievements";
import type {
  AchievementSummary,
  AchievementView,
} from "@/types/achievements";

interface AchievementsState {
  byGame: Record<string, AchievementView[]>;
  summaries: Record<string, AchievementSummary>;
  loadingId: string | null;
  syncingId: string | null;
  error: string | null;
  message: string | null;
  load: (gameId: string) => Promise<void>;
  loadSummary: (gameId: string) => Promise<void>;
  sync: (gameId: string) => Promise<void>;
  toggle: (gameId: string, apiName: string, unlocked: boolean) => Promise<void>;
}

function summaryFromList(gameId: string, items: AchievementView[]): AchievementSummary {
  return {
    gameId,
    total: items.length,
    unlocked: items.filter((item) => item.unlocked).length,
  };
}

export const useAchievementsStore = create<AchievementsState>((set, get) => ({
  byGame: {},
  summaries: {},
  loadingId: null,
  syncingId: null,
  error: null,
  message: null,
  load: async (gameId) => {
    set({ loadingId: gameId, error: null });
    try {
      const achievements = await listGameAchievements(gameId);
      set((state) => ({
        byGame: { ...state.byGame, [gameId]: achievements },
        summaries: {
          ...state.summaries,
          [gameId]: summaryFromList(gameId, achievements),
        },
        loadingId: null,
      }));
    } catch (error) {
      set({
        loadingId: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  loadSummary: async (gameId) => {
    try {
      const summary = await getAchievementSummary(gameId);
      set((state) => ({
        summaries: { ...state.summaries, [gameId]: summary },
      }));
    } catch {
      /* ignore summary errors on meta row */
    }
  },
  sync: async (gameId) => {
    set({ syncingId: gameId, error: null, message: null });
    try {
      const result = await syncGameAchievements(gameId);
      set((state) => ({
        byGame: { ...state.byGame, [gameId]: result.achievements },
        summaries: {
          ...state.summaries,
          [gameId]: summaryFromList(gameId, result.achievements),
        },
        syncingId: null,
        message: result.message,
      }));
    } catch (error) {
      set({
        syncingId: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  toggle: async (gameId, apiName, unlocked) => {
    try {
      const updated = await setAchievementUnlocked(gameId, apiName, unlocked);
      const current = get().byGame[gameId] ?? [];
      const next = current.map((item) => (item.apiName === apiName ? updated : item));
      set((state) => ({
        byGame: { ...state.byGame, [gameId]: next },
        summaries: {
          ...state.summaries,
          [gameId]: summaryFromList(gameId, next),
        },
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
}));
