export type UpdateSource = "steam" | "rss";

export interface UpdateItem {
  id: string;
  gameId: string;
  gameName: string;
  title: string;
  author: string;
  publishedAt: string;
  publishedUnix: number;
  summary: string;
  html: string;
  url: string;
  source: UpdateSource;
  feedLabel: string;
}

export interface UpdatesCache {
  items: UpdateItem[];
  seenIds: string[];
  resolvedAppIds: Record<string, number>;
  fetchedGameIds: string[];
  lastFetchedAt: number | null;
}
