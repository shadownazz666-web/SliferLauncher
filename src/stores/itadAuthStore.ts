import { create } from "zustand";
import {
  beginItadOAuth,
  ensureItadAccessToken,
  getCollection,
  getItadSession,
  getUserInfo,
  getWaitlist,
  listenItadAuthEvents,
  logoutItad,
  syncItadConfigToNative,
  type ItadSession,
} from "@/services/itad";
import { useUiStore } from "@/stores/uiStore";

interface ItadAuthState {
  connected: boolean;
  username: string | null;
  hydrating: boolean;
  connecting: boolean;
  waitlistIds: Set<string>;
  collectionIds: Set<string>;
  hydrate: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshLists: () => Promise<void>;
  isOwned: (gameId: string) => boolean;
  isWaitlisted: (gameId: string) => boolean;
  setWaitlisted: (gameId: string, on: boolean) => void;
}

function applySession(session: ItadSession): Partial<ItadAuthState> {
  return {
    connected: session.connected && Boolean(session.accessToken),
    username: session.username,
  };
}

let authListenerBound = false;

export const useItadAuthStore = create<ItadAuthState>((set, get) => ({
  connected: false,
  username: null,
  hydrating: false,
  connecting: false,
  waitlistIds: new Set(),
  collectionIds: new Set(),
  hydrate: async () => {
    set({ hydrating: true });
    try {
      await syncItadConfigToNative();
      const session = await getItadSession();
      set({ ...applySession(session), hydrating: false });
      if (session.connected) {
        await get().refreshLists();
      }
      if (!authListenerBound) {
        authListenerBound = true;
        await listenItadAuthEvents((next) => {
          set(applySession(next));
          if (next.connected) {
            void get().refreshLists();
          } else {
            set({ waitlistIds: new Set(), collectionIds: new Set(), username: null });
          }
        });
      }
    } catch {
      set({ hydrating: false, connected: false });
    }
  },
  connect: async () => {
    set({ connecting: true });
    try {
      await syncItadConfigToNative();
      await beginItadOAuth();
      useUiStore.getState().flashToast("Complete sign-in in your browser…");
    } catch (error) {
      useUiStore
        .getState()
        .flashToast(error instanceof Error ? error.message : "Could not start ITAD login");
    } finally {
      set({ connecting: false });
    }
  },
  disconnect: async () => {
    await logoutItad();
    set({
      connected: false,
      username: null,
      waitlistIds: new Set(),
      collectionIds: new Set(),
    });
    useUiStore.getState().flashToast("Disconnected from IsThereAnyDeal");
  },
  refreshLists: async () => {
    const token = await ensureItadAccessToken();
    if (!token) {
      set({ waitlistIds: new Set(), collectionIds: new Set() });
      return;
    }
    try {
      const [info, waitlist, collection] = await Promise.all([
        getUserInfo(token),
        getWaitlist(token),
        getCollection(token),
      ]);
      set({
        username: info.username,
        waitlistIds: new Set(waitlist.map((game) => game.id)),
        collectionIds: new Set(collection.map((game) => game.id)),
        connected: true,
      });
    } catch (error) {
      useUiStore
        .getState()
        .flashToast(error instanceof Error ? error.message : "Could not load ITAD lists");
    }
  },
  isOwned: (gameId) => get().collectionIds.has(gameId),
  isWaitlisted: (gameId) => get().waitlistIds.has(gameId),
  setWaitlisted: (gameId, on) => {
    const next = new Set(get().waitlistIds);
    if (on) {
      next.add(gameId);
    } else {
      next.delete(gameId);
    }
    set({ waitlistIds: next });
  },
}));
