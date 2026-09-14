import { create } from "zustand";
import {
  launchGame,
  listRunningGames,
  updateGamePreferences,
} from "@/services/launcher";
import {
  addManualGame,
  listLibraryGames,
  scanForInstalledGames,
} from "@/services/scanner";
import { useUiStore } from "@/stores/uiStore";
import type {
  GamePreferences,
  LibraryGame,
  LibraryShelf,
  LibrarySort,
  ScanProgress,
  ScanResult,
} from "@/types/library";

interface LibraryState {
  games: LibraryGame[];
  isLoading: boolean;
  isScanning: boolean;
  isAdding: boolean;
  enrichingIds: string[];
  runningGameIds: string[];
  launchingId: string | null;
  selectedGameId: string | null;
  sort: LibrarySort;
  shelf: LibraryShelf;
  activeTag: string | null;
  progress: ScanProgress | null;
  result: ScanResult | null;
  error: string | null;
  setProgress: (progress: ScanProgress) => void;
  setResult: (result: ScanResult) => void;
  patchGame: (game: LibraryGame) => void;
  markEnriching: (gameId: string, enriching: boolean) => void;
  markRunning: (gameId: string, running: boolean) => void;
  selectGame: (gameId: string | null) => void;
  setSort: (sort: LibrarySort) => void;
  setShelf: (shelf: LibraryShelf) => void;
  setActiveTag: (tag: string | null) => void;
  loadGames: () => Promise<void>;
  startScan: () => Promise<ScanResult | null>;
  addGameFromExe: () => Promise<LibraryGame | null>;
  launch: (gameId: string, profileId?: string | null) => Promise<void>;
  savePreferences: (prefs: GamePreferences) => Promise<LibraryGame | null>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  games: [],
  isLoading: false,
  isScanning: false,
  isAdding: false,
  enrichingIds: [],
  runningGameIds: [],
  launchingId: null,
  selectedGameId: null,
  sort: "name",
  shelf: "all",
  activeTag: null,
  progress: null,
  result: null,
  error: null,
  setProgress: (progress) => set({ progress, isScanning: progress.phase !== "done" }),
  setResult: (result) =>
    set({
      result,
      games: result.games.map(hydrateGame),
      isScanning: false,
      progress: {
        phase: "done",
        message: `Found ${result.found} titles`,
        found: result.found,
        saved: result.inserted + result.updated,
      },
    }),
  patchGame: (game) =>
    set((state) => ({
      games: state.games.map((item) => (item.id === game.id ? hydrateGame(game) : item)),
      enrichingIds: state.enrichingIds.filter((id) => id !== game.id),
    })),
  markEnriching: (gameId, enriching) =>
    set((state) => ({
      enrichingIds: enriching
        ? Array.from(new Set([...state.enrichingIds, gameId]))
        : state.enrichingIds.filter((id) => id !== gameId),
    })),
  markRunning: (gameId, running) =>
    set((state) => ({
      runningGameIds: running
        ? Array.from(new Set([...state.runningGameIds, gameId]))
        : state.runningGameIds.filter((id) => id !== gameId),
      launchingId: running ? state.launchingId : state.launchingId === gameId ? null : state.launchingId,
    })),
  selectGame: (selectedGameId) => set({ selectedGameId }),
  setSort: (sort) => set({ sort }),
  setShelf: (shelf) => set({ shelf }),
  setActiveTag: (activeTag) => set({ activeTag }),
  loadGames: async () => {
    set({ isLoading: true, error: null });
    try {
      const [games, runningGameIds] = await Promise.all([
        listLibraryGames(),
        listRunningGames(),
      ]);
      set({ games: games.map(hydrateGame), runningGameIds, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  startScan: async () => {
    if (get().isScanning) {
      return get().result;
    }

    set({
      isScanning: true,
      error: null,
      progress: {
        phase: "starting",
        message: "Starting background scan…",
        found: 0,
        saved: 0,
      },
    });

    try {
      const result = await scanForInstalledGames();
      get().setResult(result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ isScanning: false, error: message });
      return null;
    }
  },
  addGameFromExe: async () => {
    set({ isAdding: true, error: null });
    try {
      const added = await addManualGame();
      if (!added) {
        set({ isAdding: false });
        return null;
      }
      const game = hydrateGame(added);
      set((state) => ({
        isAdding: false,
        selectedGameId: game.id,
        games: state.games.some((item) => item.id === game.id)
          ? state.games.map((item) => (item.id === game.id ? game : item))
          : [...state.games, game],
      }));
      return game;
    } catch (error) {
      set({
        isAdding: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  },
  launch: async (gameId, profileId) => {
    if (get().runningGameIds.includes(gameId) || get().launchingId === gameId) {
      return;
    }
    set({ launchingId: gameId, error: null });
    try {
      const boosterEnabled = useUiStore.getState().gameBoosterEnabled;
      await launchGame(gameId, profileId, boosterEnabled);
      get().markRunning(gameId, true);
    } catch (error) {
      set({
        launchingId: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  savePreferences: async (prefs) => {
    try {
      const game = await updateGamePreferences(prefs);
      get().patchGame(game);
      return game;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  },
}));

function hydrateGame(game: LibraryGame): LibraryGame {
  return {
    ...game,
    customTags: game.customTags ?? [],
    launchProfiles: game.launchProfiles ?? [],
    defaultProfileId: game.defaultProfileId ?? null,
    displayName: game.displayName ?? null,
    sortIndex: game.sortIndex ?? null,
    isFavorite: Boolean(game.isFavorite),
    isHidden: Boolean(game.isHidden),
    launchArgs: game.launchArgs ?? null,
  };
}
