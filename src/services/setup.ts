import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/lib/runtime";
import {
  DEFAULT_SETUP_STATE,
  type LocalAccountPublic,
  type SetupState,
} from "@/types/setup";

const STORAGE_KEY = "slifer.setup";

function readLocal(): SetupState {
  if (typeof window === "undefined") {
    return { ...DEFAULT_SETUP_STATE };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETUP_STATE };
    }
    return { ...DEFAULT_SETUP_STATE, ...(JSON.parse(raw) as Partial<SetupState>) };
  } catch {
    return { ...DEFAULT_SETUP_STATE };
  }
}

function writeLocal(state: SetupState): SetupState {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  return state;
}

export async function loadSetupState(): Promise<SetupState> {
  if (!isTauriRuntime()) {
    return readLocal();
  }
  return invoke<SetupState>("load_setup_state");
}

export async function defaultInstallPath(): Promise<string> {
  if (!isTauriRuntime()) {
    return "C:\\Program Files\\Slifer";
  }
  return invoke<string>("default_install_path");
}

export async function saveSetupState(state: SetupState): Promise<SetupState> {
  if (!isTauriRuntime()) {
    return writeLocal(state);
  }
  return invoke<SetupState>("save_setup_state", { state });
}

export async function resetSetupState(): Promise<SetupState> {
  if (!isTauriRuntime()) {
    return writeLocal({ ...DEFAULT_SETUP_STATE });
  }
  return invoke<SetupState>("reset_setup_state");
}

export async function pickInstallDirectory(): Promise<string | null> {
  if (!isTauriRuntime()) {
    return "C:\\Program Files\\Slifer";
  }
  return invoke<string | null>("pick_install_directory");
}

export async function createLocalAccount(
  username: string,
  password: string,
): Promise<LocalAccountPublic> {
  if (!isTauriRuntime()) {
    const account = { id: `local-${Date.now()}`, username: username.trim() };
    writeLocal({
      ...readLocal(),
      accountId: account.id,
      setupComplete: true,
    });
    return account;
  }
  return invoke<LocalAccountPublic>("create_local_account", {
    request: { username, password },
  });
}

export async function loginLocalAccount(
  username: string,
  password: string,
): Promise<LocalAccountPublic> {
  if (!isTauriRuntime()) {
    const account = { id: `local-${Date.now()}`, username: username.trim() };
    writeLocal({
      ...readLocal(),
      accountId: account.id,
      setupComplete: true,
    });
    return account;
  }
  return invoke<LocalAccountPublic>("login_local_account", {
    request: { username, password },
  });
}
