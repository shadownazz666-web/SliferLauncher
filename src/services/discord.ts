import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/lib/runtime";
import { APP_ROUTES } from "@/types/navigation";

export interface DiscordConfig {
  enabled: boolean;
  clientId: string;
}

export interface DiscordPresencePayload {
  details: string;
  state?: string;
  largeImage?: string;
  largeText?: string;
  startTimestamp?: number;
}

export type DiscordBrowseContext =
  | "library"
  | "store"
  | "updates"
  | "profile"
  | "settings"
  | "wallet"
  | "other";

/**
 * Discord RPC only accepts Developer Portal asset keys (or special mp: keys).
 * Raw Steam CDN URLs make set_activity fail → reconnect → presence vanishes.
 */
export function discordSafeImageKey(key: string | null | undefined): string {
  const value = key?.trim() || "slifer";
  if (/^https?:\/\//i.test(value)) {
    return "slifer";
  }
  return value;
}

let presenceStartedAt = Math.floor(Date.now() / 1000);
let lastPresenceKey = "";

function stamp(reset: boolean): number {
  if (reset || !presenceStartedAt) {
    presenceStartedAt = Math.floor(Date.now() / 1000);
  }
  return presenceStartedAt;
}

async function publish(payload: DiscordPresencePayload, key: string, resetTimer: boolean): Promise<void> {
  if (key === lastPresenceKey && !resetTimer) {
    return;
  }
  lastPresenceKey = key;
  await setDiscordPresence({
    ...payload,
    startTimestamp: stamp(resetTimer || !payload.startTimestamp),
  });
}

export async function configureDiscordRpc(config: DiscordConfig): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  await invoke("configure_discord_rpc", { config });
}

export async function setDiscordPresence(payload: DiscordPresencePayload): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  await invoke("set_discord_presence", {
    payload: {
      ...payload,
      largeImage: discordSafeImageKey(payload.largeImage),
    },
  });
}

export async function clearDiscordPresence(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  lastPresenceKey = "";
  await invoke("clear_discord_presence");
}

export function browseContextFromPath(pathname: string): DiscordBrowseContext {
  if (pathname.startsWith(APP_ROUTES.store)) {
    return "store";
  }
  if (pathname.startsWith(APP_ROUTES.updates)) {
    return "updates";
  }
  if (pathname.startsWith(APP_ROUTES.profile)) {
    return "profile";
  }
  if (pathname.startsWith(APP_ROUTES.settings)) {
    return "settings";
  }
  if (pathname.startsWith(APP_ROUTES.wallet)) {
    return "wallet";
  }
  if (pathname.startsWith(APP_ROUTES.library)) {
    return "library";
  }
  return "other";
}

export async function setBrowsingPresence(context: DiscordBrowseContext = "library"): Promise<void> {
  const scenes: Record<DiscordBrowseContext, { details: string; state: string }> = {
    library: { details: "Browsing library", state: "Looking at games" },
    store: { details: "Browsing store", state: "Checking out titles" },
    updates: { details: "Checking updates", state: "Patch notes & client news" },
    profile: { details: "Viewing profile", state: "Slifer Commander" },
    settings: { details: "In settings", state: "Tweaking Slifer" },
    wallet: { details: "Checking wallet", state: "Slifer Launcher" },
    other: { details: "In Slifer", state: "Slifer Launcher" },
  };
  const scene = scenes[context];
  await publish(
    {
      details: scene.details,
      state: scene.state,
      largeImage: "slifer",
      largeText: "Slifer Launcher",
    },
    `browse:${context}`,
    lastPresenceKey !== `browse:${context}`,
  );
}

/** @deprecated Prefer setBrowsingPresence("library") */
export async function setIdlePresence(): Promise<void> {
  await setBrowsingPresence("library");
}

export async function setPlayingPresence(
  gameName: string,
  _steamAppId?: number | null,
  profileLabel?: string | null,
): Promise<void> {
  const name = gameName.trim() || "a game";
  const key = `playing:${name}:${profileLabel ?? ""}`;
  await publish(
    {
      details: `Playing ${name}`,
      state: profileLabel?.trim()
        ? `${profileLabel.trim()} · via Slifer`
        : "via Slifer",
      largeImage: "slifer",
      largeText: name,
    },
    key,
    lastPresenceKey !== key,
  );
}

export async function syncDiscordPresenceForRoute(
  pathname: string,
  options?: {
    playingGameName?: string | null;
    profileLabel?: string | null;
    steamAppId?: number | null;
  },
): Promise<void> {
  if (options?.playingGameName) {
    await setPlayingPresence(
      options.playingGameName,
      options.steamAppId,
      options.profileLabel,
    );
    return;
  }
  await setBrowsingPresence(browseContextFromPath(pathname));
}
