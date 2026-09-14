import { useEffect, useState } from "react";
import { Gamepad2 } from "lucide-react";
import {
  GameContextMenu,
  type GameMenuAnchor,
} from "@/components/library/GameContextMenu";
import { GameDetailView } from "@/components/library/GameDetailView";
import { GameListPane } from "@/components/library/GameListPane";
import { GameProperties } from "@/components/library/GameProperties";
import { useGameScan } from "@/hooks/useGameScan";
import { useLibraryMetadata } from "@/hooks/useLibraryMetadata";
import { filterLibrary } from "@/lib/librarySort";
import { useLibraryStore } from "@/stores/libraryStore";
import { useUiStore } from "@/stores/uiStore";
import type { LibraryGame } from "@/types/library";

export function LibraryPage() {
  const searchQuery = useUiStore((state) => state.searchQuery);
  const { games, isLoading } = useGameScan();
  useLibraryMetadata();
  const selectedGameId = useLibraryStore((state) => state.selectedGameId);
  const selectGame = useLibraryStore((state) => state.selectGame);
  const visible = filterLibrary(games, "all", null, searchQuery);
  const firstVisibleId = visible[0]?.id ?? null;
  const selected =
    visible.find((game) => game.id === selectedGameId) ??
    games.find((game) => game.id === selectedGameId) ??
    null;
  const [menu, setMenu] = useState<GameMenuAnchor | null>(null);
  const [properties, setProperties] = useState<LibraryGame | null>(null);

  useEffect(() => {
    if (selectedGameId || !firstVisibleId) {
      return;
    }
    selectGame(firstVisibleId);
  }, [firstVisibleId, selectGame, selectedGameId]);

  return (
    <div className="flex h-full min-h-0">
      <GameListPane
        onContextMenu={(game, event) => {
          setMenu({ game, x: event.clientX, y: event.clientY });
        }}
      />
      {isLoading ? (
        <div className="grid flex-1 place-items-center text-muted">
          Loading library…
        </div>
      ) : selected ? (
        <GameDetailView key={selected.id} game={selected} />
      ) : (
        <div className="grid flex-1 place-items-center px-8 text-center">
          <div>
            <Gamepad2 className="mx-auto mb-3 size-8 text-accent/50" />
            <p className="text-lg text-ivory">No games in this view</p>
            <p className="mt-1 text-sm text-muted">
              Use Scan to find Steam, Epic, GOG, and Xbox installs, or Add a Game
              to pick an .exe.
            </p>
          </div>
        </div>
      )}
      <GameContextMenu
        anchor={menu}
        onClose={() => setMenu(null)}
        onProperties={setProperties}
      />
      {properties ? (
        <GameProperties game={properties} onClose={() => setProperties(null)} />
      ) : null}
    </div>
  );
}
