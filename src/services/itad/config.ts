/** IsThereAnyDeal credentials — never hardcode; loaded from Settings / AppData. */

const KEYS = {
  apiKey: "slifer.itad.apiKey",
  clientId: "slifer.itad.clientId",
  clientSecret: "slifer.itad.clientSecret",
  country: "slifer.itad.country",
} as const;

export interface ItadConfig {
  apiKey: string;
  clientId: string;
  clientSecret: string;
  /** ISO 3166-1 alpha-2, default US */
  country: string;
}

function read(key: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(key) ?? "";
}

export function getItadConfig(): ItadConfig {
  return {
    apiKey: read(KEYS.apiKey),
    clientId: read(KEYS.clientId),
    clientSecret: read(KEYS.clientSecret),
    country: (read(KEYS.country) || "US").toUpperCase().slice(0, 2),
  };
}

export function setItadConfig(next: Partial<ItadConfig>): ItadConfig {
  const current = getItadConfig();
  const merged: ItadConfig = {
    apiKey: next.apiKey ?? current.apiKey,
    clientId: next.clientId ?? current.clientId,
    clientSecret: next.clientSecret ?? current.clientSecret,
    country: ((next.country ?? current.country) || "US").toUpperCase().slice(0, 2),
  };
  window.localStorage.setItem(KEYS.apiKey, merged.apiKey);
  window.localStorage.setItem(KEYS.clientId, merged.clientId);
  window.localStorage.setItem(KEYS.clientSecret, merged.clientSecret);
  window.localStorage.setItem(KEYS.country, merged.country);
  return merged;
}

export function itadConfigReady(config: ItadConfig = getItadConfig()): boolean {
  return Boolean(config.apiKey.trim());
}

export function itadOAuthReady(config: ItadConfig = getItadConfig()): boolean {
  return Boolean(config.clientId.trim());
}
