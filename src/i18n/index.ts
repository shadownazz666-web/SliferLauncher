import { useSetupStore } from "@/stores/setupStore";
import { en } from "@/i18n/locales/en";
import { es } from "@/i18n/locales/es";
import { fr } from "@/i18n/locales/fr";
import { de } from "@/i18n/locales/de";
import { ptBR } from "@/i18n/locales/pt-BR";
import { ja } from "@/i18n/locales/ja";
import { ko } from "@/i18n/locales/ko";
import { zhCN } from "@/i18n/locales/zh-CN";
import type { MessageKey, Messages } from "@/i18n/types";

const CATALOGS: Record<string, Messages> = {
  en,
  es,
  fr,
  de,
  "pt-BR": ptBR,
  ja,
  ko,
  "zh-CN": zhCN,
};

export function normalizeLocale(locale: string | null | undefined): string {
  const raw = (locale || "en").trim();
  if (CATALOGS[raw]) {
    return raw;
  }
  const base = raw.split("-")[0];
  if (base === "pt" && CATALOGS["pt-BR"]) {
    return "pt-BR";
  }
  if (base === "zh" && CATALOGS["zh-CN"]) {
    return "zh-CN";
  }
  if (CATALOGS[base]) {
    return base;
  }
  return "en";
}

export function translate(
  locale: string | null | undefined,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const id = normalizeLocale(locale);
  const catalog = CATALOGS[id] ?? en;
  let text = catalog[key] ?? en[key] ?? String(key);
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

/** Hook: re-renders when setup locale changes. */
export function useT() {
  const locale = useSetupStore((state) => state.locale);
  return (key: MessageKey, params?: Record<string, string | number>) =>
    translate(locale, key, params);
}

export function useLocaleId(): string {
  return normalizeLocale(useSetupStore((state) => state.locale));
}
