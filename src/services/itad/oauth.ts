import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isTauriRuntime } from "@/lib/runtime";
import { getItadConfig } from "@/services/itad/config";

export const ITAD_REDIRECT_URI = "mylauncher://auth";
export const ITAD_OAUTH_SCOPES = [
  "user_info",
  "wait_read",
  "wait_write",
  "coll_read",
  "coll_write",
].join(" ");

export interface ItadSession {
  connected: boolean;
  accessToken: string | null;
  expiresAt: number | null;
  username: string | null;
}

export async function getItadSession(): Promise<ItadSession> {
  if (!isTauriRuntime()) {
    return { connected: false, accessToken: null, expiresAt: null, username: null };
  }
  return invoke<ItadSession>("itad_get_session");
}

export async function beginItadOAuth(): Promise<void> {
  const config = getItadConfig();
  if (!config.clientId.trim()) {
    throw new Error("Add your ITAD Client ID in Settings before connecting.");
  }
  if (!isTauriRuntime()) {
    throw new Error("ITAD OAuth requires the Slifer desktop app.");
  }
  await invoke("itad_begin_oauth", {
    config: {
      clientId: config.clientId.trim(),
      clientSecret: config.clientSecret.trim(),
      redirectUri: ITAD_REDIRECT_URI,
      scopes: ITAD_OAUTH_SCOPES,
    },
  });
}

export async function refreshItadToken(): Promise<ItadSession> {
  if (!isTauriRuntime()) {
    return { connected: false, accessToken: null, expiresAt: null, username: null };
  }
  const config = getItadConfig();
  return invoke<ItadSession>("itad_refresh_token", {
    config: {
      clientId: config.clientId.trim(),
      clientSecret: config.clientSecret.trim(),
      redirectUri: ITAD_REDIRECT_URI,
      scopes: ITAD_OAUTH_SCOPES,
    },
  });
}

export async function logoutItad(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  await invoke("itad_logout");
}

export async function ensureItadAccessToken(): Promise<string | null> {
  let session = await getItadSession();
  if (!session.connected || !session.accessToken) {
    return null;
  }
  const skewMs = 60_000;
  if (session.expiresAt && session.expiresAt * 1000 - skewMs < Date.now()) {
    session = await refreshItadToken();
  }
  return session.accessToken;
}

export async function listenItadAuthEvents(
  onUpdate: (session: ItadSession) => void,
): Promise<() => void> {
  if (!isTauriRuntime()) {
    return () => undefined;
  }
  const unlisten = await listen<ItadSession>("itad-auth-changed", (event) => {
    onUpdate(event.payload);
  });
  return () => {
    unlisten();
  };
}

/** Sync frontend Settings credentials into AppData for the Rust OAuth layer. */
export async function syncItadConfigToNative(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  const config = getItadConfig();
  await invoke("itad_save_config", {
    config: {
      apiKey: config.apiKey.trim(),
      clientId: config.clientId.trim(),
      clientSecret: config.clientSecret.trim(),
      country: config.country,
    },
  });
}
