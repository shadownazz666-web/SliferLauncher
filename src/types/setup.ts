export const SETUP_LOCALES = [
  { id: "en", label: "English", native: "English" },
  { id: "es", label: "Spanish", native: "Español" },
  { id: "fr", label: "French", native: "Français" },
  { id: "de", label: "German", native: "Deutsch" },
  { id: "pt-BR", label: "Portuguese (Brazil)", native: "Português (Brasil)" },
  { id: "ja", label: "Japanese", native: "日本語" },
  { id: "ko", label: "Korean", native: "한국어" },
  { id: "zh-CN", label: "Chinese (Simplified)", native: "简体中文" },
] as const;

export type SetupLocaleId = (typeof SETUP_LOCALES)[number]["id"];

export interface SetupState {
  locale: string;
  installPath: string | null;
  accountId: string | null;
  setupComplete: boolean;
}

export interface LocalAccountPublic {
  id: string;
  username: string;
}

export const DEFAULT_SETUP_STATE: SetupState = {
  locale: "",
  installPath: null,
  accountId: null,
  setupComplete: false,
};

export type SetupStep = "language" | "install" | "auth";
