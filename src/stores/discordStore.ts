import { create } from "zustand";
import { configureDiscordRpc } from "@/services/discord";

const ENABLED_KEY = "slifer.discord.enabled";
const CLIENT_ID_KEY = "slifer.discord.clientId";

function readEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(ENABLED_KEY) === "true";
}

function readClientId(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(CLIENT_ID_KEY) ?? "";
}

interface DiscordState {
  enabled: boolean;
  clientId: string;
  setEnabled: (enabled: boolean) => void;
  setClientId: (clientId: string) => void;
  apply: () => Promise<void>;
}

let applyTimer: number | undefined;

function scheduleApply(apply: () => Promise<void>): void {
  if (typeof window === "undefined") {
    void apply();
    return;
  }
  window.clearTimeout(applyTimer);
  applyTimer = window.setTimeout(() => {
    void apply();
  }, 400);
}

export const useDiscordStore = create<DiscordState>((set, get) => ({
  enabled: readEnabled(),
  clientId: readClientId(),
  setEnabled: (enabled) => {
    window.localStorage.setItem(ENABLED_KEY, String(enabled));
    set({ enabled });
    void get().apply();
  },
  setClientId: (clientId) => {
    const next = clientId.trim();
    window.localStorage.setItem(CLIENT_ID_KEY, next);
    set({ clientId: next });
    scheduleApply(() => get().apply());
  },
  apply: async () => {
    const { enabled, clientId } = get();
    await configureDiscordRpc({ enabled, clientId });
  },
}));
