import { create } from "zustand";
import {
  createLocalAccount,
  defaultInstallPath,
  loadSetupState,
  loginLocalAccount,
  pickInstallDirectory,
  resetSetupState,
  saveSetupState,
} from "@/services/setup";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";
import {
  DEFAULT_SETUP_STATE,
  type SetupState,
  type SetupStep,
} from "@/types/setup";

interface SetupStore extends SetupState {
  ready: boolean;
  step: SetupStep;
  hydrate: () => Promise<void>;
  setStep: (step: SetupStep) => void;
  setLocale: (locale: string) => Promise<void>;
  changeLocaleAndRestart: (locale: string) => Promise<void>;
  setInstallPath: (installPath: string) => Promise<void>;
  browseInstallPath: () => Promise<void>;
  createAccount: (username: string, password: string) => Promise<void>;
  loginAccount: (username: string, password: string) => Promise<void>;
  resetSetup: () => Promise<void>;
}

function applyDocumentLocale(locale: string): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale || "en";
  }
}

export const useSetupStore = create<SetupStore>((set, get) => ({
  ...DEFAULT_SETUP_STATE,
  ready: false,
  step: "language",
  hydrate: async () => {
    try {
      const state = await loadSetupState();
      applyDocumentLocale(state.locale);
      let step: SetupStep = "language";
      if (!state.setupComplete) {
        if (!state.locale) {
          step = "language";
        } else if (!state.installPath) {
          step = "install";
        } else {
          step = "auth";
        }
      }
      set({ ...state, ready: true, step });
    } catch {
      set({ ...DEFAULT_SETUP_STATE, ready: true, step: "language" });
    }
  },
  setStep: (step) => set({ step }),
  setLocale: async (locale) => {
    const next = await saveSetupState({
      locale,
      installPath: get().installPath,
      accountId: get().accountId,
      setupComplete: Boolean(get().setupComplete),
    });
    applyDocumentLocale(next.locale);
    let installPath = next.installPath;
    if (!installPath) {
      try {
        installPath = await defaultInstallPath();
      } catch {
        installPath = "C:\\Program Files\\Slifer";
      }
    }
    set({
      ...next,
      installPath,
      step: "install",
    });
  },
  changeLocaleAndRestart: async (locale) => {
    const next = await saveSetupState({
      locale,
      installPath: get().installPath,
      accountId: get().accountId,
      setupComplete: true,
    });
    applyDocumentLocale(next.locale);
    set({ ...next, locale });
    // Apply live — full process restart crashes WebView2 on Windows (Chrome_WidgetWin_0).
    useUiStore.getState().flashToast("Language updated");
  },
  setInstallPath: async (installPath) => {
    const next = await saveSetupState({
      locale: get().locale,
      installPath,
      accountId: get().accountId,
      setupComplete: get().setupComplete,
    });
    set({ ...next, step: "auth" });
  },
  browseInstallPath: async () => {
    const picked = await pickInstallDirectory();
    if (picked) {
      set({ installPath: picked });
    }
  },
  createAccount: async (username, password) => {
    const account = await createLocalAccount(username, password);
    const next = await loadSetupState();
    useProfileStore.getState().setUsername(account.username);
    applyDocumentLocale(next.locale);
    set({ ...next, ready: true });
    useUiStore.getState().flashToast(`Welcome, ${account.username}`);
  },
  loginAccount: async (username, password) => {
    const account = await loginLocalAccount(username, password);
    const next = await loadSetupState();
    useProfileStore.getState().setUsername(account.username);
    applyDocumentLocale(next.locale);
    set({ ...next, ready: true });
    useUiStore.getState().flashToast(`Signed in as ${account.username}`);
  },
  resetSetup: async () => {
    const next = await resetSetupState();
    applyDocumentLocale(next.locale);
    set({ ...next, ready: true, step: "language" });
    useUiStore.getState().flashToast("Setup reset — restart the wizard");
  },
}));
