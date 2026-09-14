import { useEffect } from "react";
import {
  listenToSessionEnded,
  listenToSessionStarted,
} from "@/services/launcher";
import { useLibraryStore } from "@/stores/libraryStore";
import { useWalletStore } from "@/stores/walletStore";

let bound = false;

async function bindCoinListeners(): Promise<void> {
  if (bound) {
    return;
  }
  bound = true;

  await Promise.all([
    listenToSessionStarted((session) => {
      const game = useLibraryStore
        .getState()
        .games.find((item) => item.id === session.gameId);
      useWalletStore
        .getState()
        .rewardLaunch(session.gameName || game?.displayName || game?.name || "a game");
    }),
    listenToSessionEnded((session) => {
      const seconds = session.sessionSeconds ?? 0;
      useWalletStore
        .getState()
        .rewardPlaySession(session.game.name || session.game.displayName || "a game", seconds);
    }),
  ]);
}

/** Hydrate wallet, award launch/play coins, and drip idle presence rewards. */
export function useSliferCoins(): void {
  const hydrate = useWalletStore((state) => state.hydrate);
  const tickIdlePresence = useWalletStore((state) => state.tickIdlePresence);

  useEffect(() => {
    hydrate();
    void bindCoinListeners();
  }, [hydrate]);

  useEffect(() => {
    const intervalMs = 60_000;
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") {
        return;
      }
      tickIdlePresence(intervalMs);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [tickIdlePresence]);
}
