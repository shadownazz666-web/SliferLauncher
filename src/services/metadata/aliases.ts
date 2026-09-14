import { normalizeTitle } from "@/services/metadata/match";

const STEAM_APP_ALIASES: Record<string, number> = {
  "fall guys": 1097150,
  "fall guys ultimate knockout": 1097150,
  "forza horizon 6": 2483190,
  "resident evil village": 1196590,
  "resident evil 8": 1196590,
  "resident evil village gold edition": 1196590,
  "resident evil requiem": 3764200,
  "resident evil 9": 3764200,
  "resident evil 9 requiem": 3764200,
  "inzoi": 2456740,
  "overwatch": 2357570,
  "overwatch 2": 2357570,
  "meccha chameleon": 4704690,
  "dead island 2": 1941540,
  "7 days to die": 251570,
};

const EPIC_ONLY_TITLES = ["fortnite"];

export function knownSteamAppId(name: string): number | null {
  const key = normalizeTitle(name);
  const compact = compactTitle(key);
  if (STEAM_APP_ALIASES[key]) {
    return STEAM_APP_ALIASES[key];
  }
  for (const [alias, appId] of Object.entries(STEAM_APP_ALIASES)) {
    if (compact === compactTitle(alias)) {
      return appId;
    }
    if (key.startsWith(`${alias} `) || alias.startsWith(`${key} `)) {
      return appId;
    }
  }
  return null;
}

export function isEpicOnlyTitle(name: string): boolean {
  const key = normalizeTitle(name);
  return EPIC_ONLY_TITLES.some((title) => key === title || key.startsWith(`${title} `));
}

function compactTitle(value: string): string {
  return value.replace(/\s+/g, "");
}
