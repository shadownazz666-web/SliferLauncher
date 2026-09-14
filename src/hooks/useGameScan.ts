import { useEffect } from "react";
import {
  listenToSessionEnded,
  listenToSessionStarted,
} from "@/services/launcher";
import {
  listenToScanComplete,
  listenToScanProgress,
} from "@/services/scanner";
import { useLibraryStore } from "@/stores/libraryStore";
import { useUiStore } from "@/stores/uiStore";

let listenersBound = false;

async function bindScanListeners(): Promise<void> {
  if (listenersBound) {
    return;
  }
  listenersBound = true;

  const store = useLibraryStore.getState();
  await Promise.all([
    listenToScanProgress(store.setProgress),
    listenToScanComplete(store.setResult),
    listenToSessionStarted((session) => {
      useLibraryStore.getState().markRunning(session.gameId, true);
    }),
    listenToSessionEnded((session) => {
      const current = useLibraryStore.getState();
      current.markRunning(session.game.id, false);
      current.patchGame(session.game);
    }),
  ]);
}

interface UseGameScanOptions {
  bootstrap?: boolean;
}

export function useGameScan(options: UseGameScanOptions = {}) {
  const { bootstrap = false } = options;
  const games = useLibraryStore((state) => state.games);
  const isLoading = useLibraryStore((state) => state.isLoading);
  const isScanning = useLibraryStore((state) => state.isScanning);
  const progress = useLibraryStore((state) => state.progress);
  const result = useLibraryStore((state) => state.result);
  const error = useLibraryStore((state) => state.error);
  const loadGames = useLibraryStore((state) => state.loadGames);
  const startScan = useLibraryStore((state) => state.startScan);

  useEffect(() => {
    void bindScanListeners();
  }, []);

  useEffect(() => {
    if (!bootstrap) {
      return;
    }

    void loadGames();
    if (useUiStore.getState().scanOnLaunch) {
      void startScan();
    }
  }, [bootstrap, loadGames, startScan]);

  return {
    games,
    isLoading,
    isScanning,
    progress,
    result,
    error,
    loadGames,
    startScan,
  };
}
