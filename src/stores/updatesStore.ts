import { create } from "zustand";
import { aggregateUpdates } from "@/services/updates";
import type { LibraryGame } from "@/types/library";
import type { UpdateItem, UpdatesCache } from "@/types/updates";

const STORAGE_KEY = "slifer.updates";
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_HTML_CHARS = 24_000;

function readCache(): UpdatesCache {
  if (typeof window === "undefined") {
    return emptyCache();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyCache();
    }
    const parsed = JSON.parse(raw) as Partial<UpdatesCache>;
    return {
      items: parsed.items ?? [],
      seenIds: parsed.seenIds ?? [],
      resolvedAppIds: parsed.resolvedAppIds ?? {},
      fetchedGameIds: parsed.fetchedGameIds ?? [],
      lastFetchedAt: parsed.lastFetchedAt ?? null,
    };
  } catch {
    return emptyCache();
  }
}

function emptyCache(): UpdatesCache {
  return {
    items: [],
    seenIds: [],
    resolvedAppIds: {},
    fetchedGameIds: [],
    lastFetchedAt: null,
  };
}

function persist(cache: UpdatesCache): void {
  if (typeof window === "undefined") {
    return;
  }
  const compact: UpdatesCache = {
    ...cache,
    items: cache.items.map((item) => ({
      ...item,
      html:
        item.html.length > MAX_HTML_CHARS
          ? `${item.html.slice(0, MAX_HTML_CHARS)}…`
          : item.html,
    })),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
}

interface UpdatesState extends UpdatesCache {
  filterGameId: string | null;
  isLoading: boolean;
  progressLabel: string | null;
  error: string | null;
  refresh: (games: LibraryGame[], force?: boolean) => Promise<void>;
  markRead: (id: string) => void;
  markAllRead: () => void;
  setFilter: (gameId: string | null) => void;
}

export const useUpdatesStore = create<UpdatesState>((set, get) => ({
  ...readCache(),
  filterGameId: null,
  isLoading: false,
  progressLabel: null,
  error: null,
  refresh: async (games, force = false) => {
    const visible = games.filter((game) => !game.isHidden);
    if (visible.length === 0) {
      set({ items: [], fetchedGameIds: [], progressLabel: null });
      persist({ ...get(), items: [], fetchedGameIds: [] });
      return;
    }

    const state = get();
    const known = new Set(state.fetchedGameIds);
    const missing = visible.filter((game) => !known.has(game.id));
    const stale =
      !state.lastFetchedAt || Date.now() - state.lastFetchedAt > CACHE_TTL_MS;
    const targets = force || stale ? visible : missing;

    if (targets.length === 0 || state.isLoading) {
      return;
    }

    set({ isLoading: true, error: null, progressLabel: "Fetching patch notes…" });

    try {
      const resolvedAppIds = { ...get().resolvedAppIds };
      const incoming = await aggregateUpdates(
        targets,
        resolvedAppIds,
        (gameId, appId) => {
          resolvedAppIds[gameId] = appId;
        },
        (progress) => {
          set({
            progressLabel: `${progress.gameName} · ${progress.fetched}/${progress.total}`,
          });
        },
      );

      const incomingIds = new Set(incoming.map((item) => item.id));
      const targetIds = new Set(targets.map((game) => game.id));
      const retained = get().items.filter(
        (item) => !targetIds.has(item.gameId) || incomingIds.has(item.id),
      );
      const merged = mergeItems([...incoming, ...retained]);
      const fetchedGameIds = Array.from(
        new Set([...get().fetchedGameIds, ...targets.map((game) => game.id)]),
      );
      const next: UpdatesCache = {
        items: merged,
        seenIds: get().seenIds,
        resolvedAppIds,
        fetchedGameIds: force || stale ? visible.map((game) => game.id) : fetchedGameIds,
        lastFetchedAt: Date.now(),
      };
      persist(next);
      set({ ...next, isLoading: false, progressLabel: null });
    } catch (error) {
      set({
        isLoading: false,
        progressLabel: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  markRead: (id) => {
    if (get().seenIds.includes(id)) {
      return;
    }
    const seenIds = [...get().seenIds, id];
    persist({ ...snapshot(get()), seenIds });
    set({ seenIds });
  },
  markAllRead: () => {
    const seenIds = Array.from(new Set(get().items.map((item) => item.id)));
    persist({ ...snapshot(get()), seenIds });
    set({ seenIds });
  },
  setFilter: (filterGameId) => set({ filterGameId }),
}));

export function selectUnreadCount(state: UpdatesState): number {
  const seen = new Set(state.seenIds);
  return state.items.filter((item) => !seen.has(item.id)).length;
}

function snapshot(state: UpdatesState): UpdatesCache {
  return {
    items: state.items,
    seenIds: state.seenIds,
    resolvedAppIds: state.resolvedAppIds,
    fetchedGameIds: state.fetchedGameIds,
    lastFetchedAt: state.lastFetchedAt,
  };
}

function mergeItems(items: UpdateItem[]): UpdateItem[] {
  const seen = new Set<string>();
  const unique: UpdateItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    unique.push(item);
  }
  return unique.sort((left, right) => right.publishedUnix - left.publishedUnix);
}
