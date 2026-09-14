import { useMemo, useState, type DragEvent, type MouseEvent } from "react";
import { ChevronDown, GripVertical, Plus, Search } from "lucide-react";
import { SteamArt } from "@/components/library/SteamArt";
import { groupLibrary } from "@/lib/libraryGroups";
import { filterLibrary, gameTitle, sortLibrary } from "@/lib/librarySort";
import { cn } from "@/lib/cn";
import { useGameScan } from "@/hooks/useGameScan";
import { useLibraryStore } from "@/stores/libraryStore";
import { useUiStore } from "@/stores/uiStore";
import type { LibraryGame, LibrarySort } from "@/types/library";

const SORTS: Array<{ id: LibrarySort; label: string }> = [
  { id: "name", label: "Name" },
  { id: "lastPlayed", label: "Recent" },
  { id: "playtime", label: "Playtime" },
  { id: "custom", label: "Custom" },
];

interface GameListPaneProps {
  onContextMenu?: (game: LibraryGame, event: MouseEvent) => void;
}

export function GameListPane({ onContextMenu }: GameListPaneProps) {
  const games = useLibraryStore((state) => state.games);
  const sort = useLibraryStore((state) => state.sort);
  const selectedGameId = useLibraryStore((state) => state.selectedGameId);
  const runningGameIds = useLibraryStore((state) => state.runningGameIds);
  const setSort = useLibraryStore((state) => state.setSort);
  const selectGame = useLibraryStore((state) => state.selectGame);
  const savePreferences = useLibraryStore((state) => state.savePreferences);
  const searchQuery = useUiStore((state) => state.searchQuery);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);
  const collapsedGroups = useUiStore((state) => state.collapsedGroups);
  const toggleGroup = useUiStore((state) => state.toggleGroup);
  const { isScanning, startScan } = useGameScan();
  const isAdding = useLibraryStore((state) => state.isAdding);
  const addGameFromExe = useLibraryStore((state) => state.addGameFromExe);
  const [dragId, setDragId] = useState<string | null>(null);

  async function pickGameExe() {
    if (isAdding) {
      return;
    }
    await addGameFromExe();
  }

  const visible = filterLibrary(games, "all", null, searchQuery);
  const customOrdered = useMemo(
    () => (sort === "custom" ? sortLibrary(visible, "custom") : []),
    [sort, visible],
  );
  const groups = sort === "custom" ? [] : groupLibrary(visible, sort);

  async function reorderCustom(targetId: string): Promise<void> {
    if (!dragId || dragId === targetId || sort !== "custom") {
      return;
    }
    const ordered = [...customOrdered];
    const from = ordered.findIndex((game) => game.id === dragId);
    const to = ordered.findIndex((game) => game.id === targetId);
    if (from < 0 || to < 0) {
      return;
    }
    const [moved] = ordered.splice(from, 1);
    if (!moved) {
      return;
    }
    ordered.splice(to, 0, moved);
    await Promise.all(
      ordered.map((game, index) =>
        savePreferences({ gameId: game.id, sortIndex: index }),
      ),
    );
  }

  return (
    <aside className="slifer-list flex h-full w-[250px] shrink-0 flex-col">
      <div className="space-y-2 border-b border-line px-2 py-2">
        <label className="flex h-8 items-center gap-2 rounded-xl bg-inset px-2">
          <Search className="size-3.5 text-muted" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name"
            className="h-full w-full bg-transparent text-[12px] text-ivory outline-none placeholder:text-muted"
          />
        </label>
        <div className="flex flex-wrap items-center gap-1">
          {SORTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSort(item.id)}
              className={cn(
                "rounded-xl px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]",
                sort === item.id
                  ? "bg-chip text-ivory"
                  : "text-muted hover:text-ivory",
              )}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void startScan()}
            disabled={isScanning}
            className={cn(
              "rounded-xl px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]",
              isScanning
                ? "bg-chip text-ivory"
                : "text-accent hover:text-ivory",
            )}
          >
            {isScanning ? "Scanning" : "Scan"}
          </button>
        </div>
        {sort === "custom" ? (
          <p className="px-1 text-[10px] text-muted">Drag titles to reorder this list.</p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {sort === "custom"
          ? customOrdered.map((game) => (
              <GameRow
                key={game.id}
                game={game}
                active={selectedGameId === game.id}
                running={runningGameIds.includes(game.id)}
                draggable
                dragging={dragId === game.id}
                onSelect={() => selectGame(game.id)}
                onContextMenu={onContextMenu}
                onDragStart={() => setDragId(game.id)}
                onDragEnd={() => setDragId(null)}
                onDrop={() => void reorderCustom(game.id)}
              />
            ))
          : groups.map((group) => {
              const collapsed = Boolean(collapsedGroups[group.id]);
              return (
                <div key={group.id} className="mb-0.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="flex w-full items-center gap-1 px-2 py-1 text-left text-[11px] font-semibold tracking-[0.12em] text-muted hover:text-ivory"
                  >
                    <ChevronDown
                      className={cn("size-3 transition-transform", collapsed && "-rotate-90")}
                    />
                    {group.label}
                  </button>
                  {!collapsed
                    ? group.games.map((game) => (
                        <GameRow
                          key={`${group.id}:${game.id}`}
                          game={game}
                          active={selectedGameId === game.id}
                          running={runningGameIds.includes(game.id)}
                          onSelect={() => selectGame(game.id)}
                          onContextMenu={onContextMenu}
                        />
                      ))
                    : null}
                </div>
              );
            })}
      </div>

      <button
        type="button"
        onClick={() => void pickGameExe()}
        disabled={isAdding}
        className="flex h-10 items-center gap-2 border-t border-line px-3 text-[12px] text-ivory hover:bg-hover disabled:opacity-50"
      >
        <Plus className="size-3.5 text-accent" />
        {isAdding ? "Adding…" : "Add a Game"}
      </button>
    </aside>
  );
}

interface GameRowProps {
  game: LibraryGame;
  active: boolean;
  running: boolean;
  onSelect: () => void;
  onContextMenu?: (game: LibraryGame, event: MouseEvent) => void;
  draggable?: boolean;
  dragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDrop?: () => void;
}

function GameRow({
  game,
  active,
  running,
  onSelect,
  onContextMenu,
  draggable = false,
  dragging = false,
  onDragStart,
  onDragEnd,
  onDrop,
}: GameRowProps) {
  function handleDragOver(event: DragEvent<HTMLButtonElement>): void {
    if (!draggable) {
      return;
    }
    event.preventDefault();
  }

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(event) => {
        if (!draggable) {
          return;
        }
        event.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      onDragOver={handleDragOver}
      onDrop={(event) => {
        if (!draggable) {
          return;
        }
        event.preventDefault();
        onDrop?.();
      }}
      onClick={onSelect}
      onContextMenu={(event) => {
        event.preventDefault();
        onSelect();
        onContextMenu?.(game, event);
      }}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-[5px] text-left text-[13px]",
        active
          ? "bg-active text-ivory"
          : "text-ivory/85 hover:bg-hover hover:text-ivory",
        dragging && "opacity-50",
      )}
    >
      {draggable ? <GripVertical className="size-3 shrink-0 text-muted" /> : null}
      <span className="relative size-[18px] shrink-0 overflow-hidden rounded-md bg-chip">
        <SteamArt game={game} kind="icon" className="size-full" />
        {running ? (
          <span className="absolute -right-0.5 -bottom-0.5 size-1.5 rounded-full bg-accent" />
        ) : null}
      </span>
      <span className="truncate">{gameTitle(game)}</span>
    </button>
  );
}
