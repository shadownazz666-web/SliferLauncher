import type { LibraryGame, LibraryShelf, LibrarySort } from "@/types/library";

export function gameTitle(game: Pick<LibraryGame, "name" | "displayName">): string {
  const custom = game.displayName?.trim();
  return custom || game.name;
}

export function collectTags(games: LibraryGame[]): string[] {
  const tags = new Set<string>();
  for (const game of games) {
    for (const tag of game.customTags) {
      if (tag.trim()) {
        tags.add(tag.trim());
      }
    }
  }
  return [...tags].sort((left, right) => left.localeCompare(right));
}

export function filterLibrary(
  games: LibraryGame[],
  shelf: LibraryShelf,
  tag: string | null,
  query: string,
): LibraryGame[] {
  const normalized = query.trim().toLowerCase();

  return games.filter((game) => {
    if (shelf === "favorites" && !game.isFavorite) {
      return false;
    }
    if (shelf === "hidden") {
      if (!game.isHidden) {
        return false;
      }
    } else if (game.isHidden) {
      return false;
    }
    if (tag && !game.customTags.some((value) => value.toLowerCase() === tag.toLowerCase())) {
      return false;
    }
    if (!normalized) {
      return true;
    }
    const haystack =
      `${gameTitle(game)} ${game.name} ${game.platform} ${game.collectionTag ?? ""} ${game.customTags.join(" ")} ${game.description ?? ""}`.toLowerCase();
    return haystack.includes(normalized);
  });
}

export function sortLibrary(games: LibraryGame[], sort: LibrarySort): LibraryGame[] {
  const sorted = [...games];
  sorted.sort((left, right) => {
    switch (sort) {
      case "lastPlayed":
        return timestamp(right.lastPlayed) - timestamp(left.lastPlayed);
      case "playtime":
        return right.playtimeMinutes - left.playtimeMinutes;
      case "dateAdded":
        return timestamp(right.addedAt) - timestamp(left.addedAt);
      case "custom": {
        const leftIndex = left.sortIndex ?? Number.MAX_SAFE_INTEGER;
        const rightIndex = right.sortIndex ?? Number.MAX_SAFE_INTEGER;
        if (leftIndex !== rightIndex) {
          return leftIndex - rightIndex;
        }
        return gameTitle(left).localeCompare(gameTitle(right), undefined, { sensitivity: "base" });
      }
      case "name":
      default:
        return gameTitle(left).localeCompare(gameTitle(right), undefined, { sensitivity: "base" });
    }
  });
  return sorted;
}

function timestamp(value: string | null): number {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
