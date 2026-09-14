import { sortLibrary } from "@/lib/librarySort";
import type { LibraryGame, LibrarySort } from "@/types/library";

export interface GameGroup {
  id: string;
  label: string;
  games: LibraryGame[];
}

export function categoryOf(game: LibraryGame): string | null {
  const tagged = game.collectionTag?.trim() || game.customTags[0]?.trim();
  return tagged || null;
}

export function groupLibrary(games: LibraryGame[], sort: LibrarySort): GameGroup[] {
  const ordered = sortLibrary(games, sort);
  const favorites = ordered.filter((game) => game.isFavorite);
  const categories = new Map<string, LibraryGame[]>();

  for (const game of ordered) {
    const category = categoryOf(game);
    if (!category || category.toLowerCase() === "manual") {
      continue;
    }
    const bucket = categories.get(category) ?? [];
    bucket.push(game);
    categories.set(category, bucket);
  }

  const groups: GameGroup[] = [];
  if (favorites.length > 0) {
    groups.push({ id: "favorites", label: "FAVORITES", games: favorites });
  }
  groups.push({ id: "installed", label: "INSTALLED", games: ordered });
  for (const [label, items] of [...categories.entries()].sort((left, right) =>
    left[0].localeCompare(right[0]),
  )) {
    groups.push({
      id: `category:${label.toLowerCase()}`,
      label: label.toUpperCase(),
      games: items,
    });
  }
  return groups;
}
