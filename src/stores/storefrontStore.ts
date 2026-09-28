import { create } from "zustand";
import {
  ItadHttpError,
  gameOverview,
  listDeals,
  searchGames,
} from "@/services/itad";
import { itadConfigReady } from "@/services/itad/config";
import type {
  ItadDealListItem,
  ItadDealSort,
  ItadGame,
  ItadOverviewPrice,
} from "@/types/itad";

interface StorefrontState {
  deals: ItadDealListItem[];
  searchResults: ItadGame[];
  searchQuery: string;
  sort: ItadDealSort | string;
  nextOffset: number;
  hasMore: boolean;
  loadingDeals: boolean;
  loadingMore: boolean;
  searching: boolean;
  error: string | null;
  selectedId: string | null;
  overview: ItadOverviewPrice | null;
  overviewTitle: string | null;
  overviewLoading: boolean;
  loadDeals: (reset?: boolean) => Promise<void>;
  setSort: (sort: ItadDealSort | string) => void;
  setSearchQuery: (query: string) => void;
  runSearch: () => Promise<void>;
  clearSearch: () => void;
  openGame: (id: string, title?: string) => Promise<void>;
  closeGame: () => void;
}

let searchTimer: number | undefined;

export const useStorefrontStore = create<StorefrontState>((set, get) => ({
  deals: [],
  searchResults: [],
  searchQuery: "",
  sort: "-cut",
  nextOffset: 0,
  hasMore: false,
  loadingDeals: false,
  loadingMore: false,
  searching: false,
  error: null,
  selectedId: null,
  overview: null,
  overviewTitle: null,
  overviewLoading: false,
  loadDeals: async (reset = true) => {
    if (!itadConfigReady()) {
      set({
        error: "Add your IsThereAnyDeal API key in Settings to load the Store.",
        deals: reset ? [] : get().deals,
        loadingDeals: false,
        loadingMore: false,
      });
      return;
    }
    const offset = reset ? 0 : get().nextOffset;
    set({
      error: null,
      loadingDeals: reset,
      loadingMore: !reset,
    });
    try {
      const response = await listDeals({
        offset,
        limit: 24,
        sort: get().sort,
      });
      set({
        deals: reset ? response.list : [...get().deals, ...response.list],
        nextOffset: response.nextOffset,
        hasMore: response.hasMore,
        loadingDeals: false,
        loadingMore: false,
      });
    } catch (error) {
      const message =
        error instanceof ItadHttpError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not load deals";
      set({ error: message, loadingDeals: false, loadingMore: false });
    }
  },
  setSort: (sort) => {
    set({ sort });
    void get().loadDeals(true);
  },
  setSearchQuery: (query) => {
    set({ searchQuery: query });
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      void get().runSearch();
    }, 320);
  },
  runSearch: async () => {
    const query = get().searchQuery.trim();
    if (!query) {
      set({ searchResults: [], searching: false });
      return;
    }
    if (!itadConfigReady()) {
      set({ error: "Add your IsThereAnyDeal API key in Settings to search." });
      return;
    }
    set({ searching: true, error: null });
    try {
      const results = await searchGames(query, 24);
      set({ searchResults: results, searching: false });
    } catch (error) {
      set({
        searching: false,
        error: error instanceof Error ? error.message : "Search failed",
      });
    }
  },
  clearSearch: () => {
    window.clearTimeout(searchTimer);
    set({ searchQuery: "", searchResults: [], searching: false });
  },
  openGame: async (id, title) => {
    set({
      selectedId: id,
      overviewTitle: title ?? null,
      overview: null,
      overviewLoading: true,
      error: null,
    });
    try {
      const response = await gameOverview([id]);
      set({
        overview: response.prices[0] ?? null,
        overviewLoading: false,
      });
    } catch (error) {
      set({
        overviewLoading: false,
        error: error instanceof Error ? error.message : "Could not load game overview",
      });
    }
  },
  closeGame: () => {
    set({ selectedId: null, overview: null, overviewTitle: null, overviewLoading: false });
  },
}));
