import { useEffect, useRef } from "react";
import { enrichGame, needsMetadata } from "@/services/metadata";
import { useLibraryStore } from "@/stores/libraryStore";

const ENRICH_CONCURRENCY = 3;

export function useLibraryMetadata() {
  const games = useLibraryStore((state) => state.games);
  const isScanning = useLibraryStore((state) => state.isScanning);
  const isLoading = useLibraryStore((state) => state.isLoading);
  const enrichingIds = useLibraryStore((state) => state.enrichingIds);
  const inFlight = useRef(new Set<string>());
  const attempted = useRef(new Set<string>());

  useEffect(() => {
    if (isScanning || isLoading) {
      return;
    }

    const pending = games.filter(
      (game) =>
        needsMetadata(game) &&
        !inFlight.current.has(game.id) &&
        !attempted.current.has(game.id),
    );
    if (pending.length === 0) {
      return;
    }

    const queue = [...pending];
    const workers = Array.from(
      { length: Math.min(ENRICH_CONCURRENCY, queue.length) },
      async () => {
        while (queue.length > 0) {
          const next = queue.shift();
          if (!next) {
            return;
          }

          inFlight.current.add(next.id);
          useLibraryStore.getState().markEnriching(next.id, true);
          try {
            const updated = await enrichGame(next);
            attempted.current.add(next.id);
            useLibraryStore.getState().patchGame(updated);
          } catch (error) {
            console.warn(`Metadata enrich failed for ${next.name}`, error);
            attempted.current.add(next.id);
            useLibraryStore.getState().markEnriching(next.id, false);
          } finally {
            inFlight.current.delete(next.id);
          }
        }
      },
    );

    void Promise.all(workers);
  }, [games, isLoading, isScanning]);

  return {
    enrichingIds,
    isEnriching: enrichingIds.length > 0,
  };
}
