import type { GamePlatform, LibraryGame } from "@/types/library";

const PLATFORM_ACCENTS: Record<GamePlatform, string> = {
  Steam: "#e8c36a",
  Epic: "#e11d2e",
  GOG: "#a78bfa",
  Custom: "#94a3b8",
};

export function platformAccent(platform: GamePlatform): string {
  return PLATFORM_ACCENTS[platform];
}

export function formatPlaytime(minutes: number): string {
  if (minutes <= 0) {
    return "0 hrs";
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  return `${Math.round(minutes / 60)} hrs`;
}

export function formatLastPlayed(value: string | null): string {
  if (!value) {
    return "Never played";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  const deltaMs = Date.now() - parsed;
  const days = Math.floor(deltaMs / 86_400_000);
  if (days <= 0) {
    return "Today";
  }
  if (days === 1) {
    return "Yesterday";
  }
  if (days < 7) {
    return `${days} days ago`;
  }
  return new Date(parsed).toLocaleDateString();
}

export function gameMatchesQuery(game: LibraryGame, query: string): boolean {
  if (!query) {
    return true;
  }
  const haystack = `${game.name} ${game.platform} ${game.collectionTag ?? ""} ${game.description ?? ""}`.toLowerCase();
  return haystack.includes(query);
}
