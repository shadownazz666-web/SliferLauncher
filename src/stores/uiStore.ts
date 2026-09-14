import { create } from "zustand";

const SCAN_ON_LAUNCH_KEY = "slifer.scanOnLaunch";
const GAME_BOOSTER_KEY = "slifer.gameBooster";
const COUCH_MODE_KEY = "slifer.couchMode";
const VIRTUAL_MOUSE_KEY = "slifer.virtualMouse";

function readFlag(key: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(key) === "true";
}

interface UiState {
  searchQuery: string;
  liquidGlassEnabled: boolean;
  scanOnLaunch: boolean;
  gameBoosterEnabled: boolean;
  couchMode: boolean;
  virtualMouse: boolean;
  updating: boolean;
  collapsedGroups: Record<string, boolean>;
  toast: string | null;
  setSearchQuery: (searchQuery: string) => void;
  setLiquidGlassEnabled: (liquidGlassEnabled: boolean) => void;
  setScanOnLaunch: (scanOnLaunch: boolean) => void;
  setGameBoosterEnabled: (enabled: boolean) => void;
  setCouchMode: (enabled: boolean) => void;
  setVirtualMouse: (enabled: boolean) => void;
  setUpdating: (updating: boolean) => void;
  toggleGroup: (groupId: string) => void;
  flashToast: (toast: string) => void;
  clearToast: () => void;
}

let toastTimer: number | undefined;

export const useUiStore = create<UiState>((set) => ({
  searchQuery: "",
  liquidGlassEnabled: true,
  scanOnLaunch: readFlag(SCAN_ON_LAUNCH_KEY),
  gameBoosterEnabled: readFlag(GAME_BOOSTER_KEY),
  couchMode: readFlag(COUCH_MODE_KEY),
  virtualMouse: readFlag(VIRTUAL_MOUSE_KEY),
  updating: false,
  collapsedGroups: {},
  toast: null,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLiquidGlassEnabled: (liquidGlassEnabled) => set({ liquidGlassEnabled }),
  setScanOnLaunch: (scanOnLaunch) => {
    window.localStorage.setItem(SCAN_ON_LAUNCH_KEY, String(scanOnLaunch));
    set({ scanOnLaunch });
  },
  setGameBoosterEnabled: (gameBoosterEnabled) => {
    window.localStorage.setItem(GAME_BOOSTER_KEY, String(gameBoosterEnabled));
    set({ gameBoosterEnabled });
  },
  setCouchMode: (couchMode) => {
    window.localStorage.setItem(COUCH_MODE_KEY, String(couchMode));
    set({ couchMode });
  },
  setVirtualMouse: (virtualMouse) => {
    window.localStorage.setItem(VIRTUAL_MOUSE_KEY, String(virtualMouse));
    set({ virtualMouse });
  },
  setUpdating: (updating) => set({ updating }),
  toggleGroup: (groupId) =>
    set((state) => ({
      collapsedGroups: {
        ...state.collapsedGroups,
        [groupId]: !state.collapsedGroups[groupId],
      },
    })),
  flashToast: (toast) => {
    if (typeof window !== "undefined") {
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        set({ toast: null });
      }, 2800);
    }
    set({ toast });
  },
  clearToast: () => set({ toast: null }),
}));
