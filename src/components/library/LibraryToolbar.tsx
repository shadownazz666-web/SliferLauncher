import type { ReactNode } from "react";
import { Heart, Tags } from "lucide-react";
import { collectTags } from "@/lib/librarySort";
import { cn } from "@/lib/cn";
import { useLibraryStore } from "@/stores/libraryStore";
import type { LibraryShelf, LibrarySort } from "@/types/library";

const SORTS: Array<{ id: LibrarySort; label: string }> = [
  { id: "name", label: "A–Z" },
  { id: "lastPlayed", label: "Last played" },
  { id: "playtime", label: "Playtime" },
  { id: "dateAdded", label: "Date added" },
  { id: "custom", label: "Custom" },
];

const SHELVES: Array<{ id: LibraryShelf; label: string }> = [
  { id: "all", label: "All" },
  { id: "favorites", label: "Favorites" },
  { id: "hidden", label: "Hidden" },
];

export function LibraryToolbar() {
  const games = useLibraryStore((state) => state.games);
  const sort = useLibraryStore((state) => state.sort);
  const shelf = useLibraryStore((state) => state.shelf);
  const activeTag = useLibraryStore((state) => state.activeTag);
  const setSort = useLibraryStore((state) => state.setSort);
  const setShelf = useLibraryStore((state) => state.setShelf);
  const setActiveTag = useLibraryStore((state) => state.setActiveTag);
  const tags = collectTags(games);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {SHELVES.map((item) => (
          <FilterChip
            key={item.id}
            active={shelf === item.id}
            onClick={() => setShelf(item.id)}
          >
            {item.id === "favorites" && <Heart className="size-3.5" />}
            {item.label}
          </FilterChip>
        ))}
        <span className="mx-1 h-4 w-px bg-white/10" />
        {SORTS.map((item) => (
          <FilterChip
            key={item.id}
            active={sort === item.id}
            onClick={() => setSort(item.id)}
          >
            {item.label}
          </FilterChip>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Tags className="size-3.5 text-ivory/40" />
          <FilterChip active={activeTag === null} onClick={() => setActiveTag(null)}>
            Every tag
          </FilterChip>
          {tags.map((tag) => (
            <FilterChip
              key={tag}
              active={activeTag === tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              {tag}
            </FilterChip>
          ))}
        </div>
      )}
    </div>
  );
}

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

function FilterChip({ active, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs uppercase tracking-[0.12em] transition-colors",
        active
          ? "bg-crimson/20 text-ivory shadow-[inset_0_0_0_1px_rgba(225,29,46,0.4)]"
          : "bg-white/5 text-ivory/55 hover:bg-white/8 hover:text-ivory",
      )}
    >
      {children}
    </button>
  );
}
