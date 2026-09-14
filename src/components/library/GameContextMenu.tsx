import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight, Play } from "lucide-react";
import { collectTags, gameTitle } from "@/lib/librarySort";
import { openExternal } from "@/lib/openExternal";
import { openLocalPath } from "@/lib/openLocal";
import { resolvedSteamAppId, steamStoreUrl } from "@/lib/steamArt";
import { cn } from "@/lib/cn";
import { useLibraryStore } from "@/stores/libraryStore";
import type { LibraryGame } from "@/types/library";

export interface GameMenuAnchor {
  game: LibraryGame;
  x: number;
  y: number;
}

interface GameContextMenuProps {
  anchor: GameMenuAnchor | null;
  onClose: () => void;
  onProperties: (game: LibraryGame) => void;
}

type Submenu = "add" | "remove" | "manage" | null;

export function GameContextMenu({ anchor, onClose, onProperties }: GameContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const launch = useLibraryStore((state) => state.launch);
  const savePreferences = useLibraryStore((state) => state.savePreferences);
  const running = useLibraryStore((state) =>
    anchor ? state.runningGameIds.includes(anchor.game.id) : false,
  );
  const launching = useLibraryStore((state) =>
    anchor ? state.launchingId === anchor.game.id : false,
  );
  const games = useLibraryStore((state) => state.games);
  const [submenu, setSubmenu] = useState<Submenu>(null);
  const [newCategory, setNewCategory] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    setSubmenu(null);
    setNewCategory("");
    setRenaming(false);
    setRenameValue("");
  }, [anchor?.game.id, anchor?.x, anchor?.y]);

  useEffect(() => {
    if (!anchor) {
      return;
    }

    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  if (!anchor) {
    return null;
  }

  const game = games.find((item) => item.id === anchor.game.id) ?? anchor.game;
  const tags = collectTags(games);
  const left = Math.min(anchor.x, window.innerWidth - 280);
  const top = Math.min(anchor.y, window.innerHeight - 320);

  async function addTag(tag: string): Promise<void> {
    const next = tag.trim();
    if (!next || game.customTags.some((item) => item.toLowerCase() === next.toLowerCase())) {
      return;
    }
    await savePreferences({ gameId: game.id, customTags: [...game.customTags, next] });
    onClose();
  }

  async function removeTag(tag: string): Promise<void> {
    await savePreferences({
      gameId: game.id,
      customTags: game.customTags.filter((item) => item !== tag),
    });
    onClose();
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      style={{ left, top }}
      className="glass-menu fixed z-60 w-56 rounded-xl py-1.5 text-[13px] text-ivory"
    >
      <button
        type="button"
        role="menuitem"
        disabled={running || launching}
        onClick={() => {
          void launch(game.id);
          onClose();
        }}
        className="slifer-play mx-1 mb-1 flex w-[calc(100%-8px)] items-center justify-center gap-2 px-3 py-2 text-[13px] font-bold tracking-[0.08em] text-white disabled:opacity-55"
      >
        <Play className="size-3.5 fill-current" />
        {running ? "PLAYING" : launching ? "LAUNCHING" : "PLAY"}
      </button>

      <MenuRow
        onClick={() => {
          void savePreferences({ gameId: game.id, isFavorite: !game.isFavorite });
          onClose();
        }}
      >
        {game.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
      </MenuRow>

      {renaming ? (
        <form
          className="px-2 py-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            void savePreferences({
              gameId: game.id,
              displayName: renameValue.trim() || "",
            }).then(() => onClose());
          }}
        >
          <input
            autoFocus
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            placeholder={game.name}
            className="h-7 w-full rounded-sm border border-line bg-inset px-2 text-[12px] text-ivory outline-none placeholder:text-muted focus:border-accent"
          />
          <div className="mt-1.5 flex gap-1">
            <button
              type="submit"
              className="flex-1 rounded-sm bg-accent px-2 py-1 text-[11px] text-white"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                void savePreferences({ gameId: game.id, displayName: "" }).then(() => onClose());
              }}
              className="rounded-sm border border-line px-2 py-1 text-[11px] text-muted hover:text-ivory"
            >
              Reset
            </button>
          </div>
        </form>
      ) : (
        <MenuRow
          onClick={() => {
            setRenaming(true);
            setRenameValue(gameTitle(game));
            setSubmenu(null);
          }}
        >
          Rename…
        </MenuRow>
      )}

      <SubRow
        label="Add to"
        open={submenu === "add"}
        onOpen={() => setSubmenu("add")}
      >
        <MenuRow
          onClick={() => {
            void savePreferences({ gameId: game.id, isFavorite: true });
            onClose();
          }}
        >
          Favorites
        </MenuRow>
        {tags.map((tag) => (
          <MenuRow key={tag} onClick={() => void addTag(tag)}>
            {tag}
          </MenuRow>
        ))}
        <form
          className="px-2 py-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            void addTag(newCategory);
            setNewCategory("");
          }}
        >
          <input
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            placeholder="New category..."
            className="h-7 w-full rounded-sm border border-line bg-inset px-2 text-[12px] text-ivory outline-none placeholder:text-muted focus:border-accent"
          />
        </form>
      </SubRow>

      <SubRow
        label="Remove from"
        open={submenu === "remove"}
        onOpen={() => setSubmenu("remove")}
      >
        {game.isFavorite ? (
          <MenuRow
            onClick={() => {
              void savePreferences({ gameId: game.id, isFavorite: false });
              onClose();
            }}
          >
            Favorites
          </MenuRow>
        ) : null}
        {game.customTags.map((tag) => (
          <MenuRow key={tag} onClick={() => void removeTag(tag)}>
            {tag}
          </MenuRow>
        ))}
        {game.isHidden ? (
          <MenuRow
            onClick={() => {
              void savePreferences({ gameId: game.id, isHidden: false });
              onClose();
            }}
          >
            Hidden
          </MenuRow>
        ) : null}
        {!game.isFavorite && game.customTags.length === 0 && !game.isHidden ? (
          <p className="px-3 py-1.5 text-[12px] text-muted">Nothing to remove</p>
        ) : null}
      </SubRow>

      <SubRow
        label="Manage"
        open={submenu === "manage"}
        onOpen={() => setSubmenu("manage")}
      >
        <MenuRow
          onClick={() => {
            void openLocalPath(game.installDir);
            onClose();
          }}
        >
          Browse local files
        </MenuRow>
        <MenuRow
          onClick={() => {
            void savePreferences({ gameId: game.id, isHidden: !game.isHidden });
            onClose();
          }}
        >
          {game.isHidden ? "Unhide this game" : "Hide this game"}
        </MenuRow>
        {resolvedSteamAppId(game) ? (
          <MenuRow
            onClick={() => {
              const appId = resolvedSteamAppId(game);
              if (appId) {
                void openExternal(steamStoreUrl(appId));
              }
              onClose();
            }}
          >
            View on Steam
          </MenuRow>
        ) : null}
      </SubRow>

      <div className="my-1 h-px bg-line" />
      <MenuRow
        onClick={() => {
          onProperties(game);
          onClose();
        }}
      >
        Properties...
      </MenuRow>
    </div>
  );
}

function MenuRow({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="block w-full px-3 py-1.5 text-left hover:bg-hover hover:text-white"
    >
      {children}
    </button>
  );
}

function SubRow({
  label,
  open,
  onOpen,
  children,
}: {
  label: string;
  open: boolean;
  onOpen: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative" onMouseEnter={onOpen}>
      <button
        type="button"
        role="menuitem"
        onClick={onOpen}
        className={cn(
          "flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-hover hover:text-white",
          open && "bg-hover text-ivory",
        )}
      >
        {label}
        <ChevronRight className="size-3.5 text-muted" />
      </button>
      {open ? (
        <div className="glass-menu absolute top-0 left-full z-10 ml-0.5 w-52 rounded-xl py-1">
          {children}
        </div>
      ) : null}
    </div>
  );
}
