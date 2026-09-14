const KEYS = {
  steamGridDb: "slifer.steamgriddbKey",
  igdbClientId: "slifer.igdbClientId",
  igdbClientSecret: "slifer.igdbClientSecret",
} as const;

export interface MetadataApiConfig {
  steamGridDbKey: string;
  igdbClientId: string;
  igdbClientSecret: string;
}

function read(key: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(key) ?? "";
}

export function getMetadataConfig(): MetadataApiConfig {
  return {
    steamGridDbKey: read(KEYS.steamGridDb),
    igdbClientId: read(KEYS.igdbClientId),
    igdbClientSecret: read(KEYS.igdbClientSecret),
  };
}

export function setMetadataConfig(next: Partial<MetadataApiConfig>): MetadataApiConfig {
  const current = getMetadataConfig();
  const merged = { ...current, ...next };
  window.localStorage.setItem(KEYS.steamGridDb, merged.steamGridDbKey);
  window.localStorage.setItem(KEYS.igdbClientId, merged.igdbClientId);
  window.localStorage.setItem(KEYS.igdbClientSecret, merged.igdbClientSecret);
  return merged;
}
