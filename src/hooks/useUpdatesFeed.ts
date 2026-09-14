import { useEffect, useMemo } from "react";
import { useLibraryStore } from "@/stores/libraryStore";
import { useUpdatesStore } from "@/stores/updatesStore";

export function useUpdatesFeed(): void {
  const games = useLibraryStore((state) => state.games);
  const isLoading = useLibraryStore((state) => state.isLoading);
  const isScanning = useLibraryStore((state) => state.isScanning);
  const refresh = useUpdatesStore((state) => state.refresh);

  const signature = useMemo(
    () =>
      games
        .filter((game) => !game.isHidden)
        .map((game) => `${game.id}:${game.steamAppId ?? ""}`)
        .sort()
        .join("|"),
    [games],
  );

  useEffect(() => {
    if (isLoading || isScanning) {
      return;
    }
    const visible = useLibraryStore.getState().games.filter((game) => !game.isHidden);
    if (visible.length === 0) {
      return;
    }
    void refresh(visible);
  }, [isLoading, isScanning, refresh, signature]);
}
