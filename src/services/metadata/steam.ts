import { isEpicOnlyTitle, knownSteamAppId } from "@/services/metadata/aliases";
import { fetchRemoteJson } from "@/services/metadata/http";
import { titlesLikelyMatch } from "@/services/metadata/match";
import type { RemoteArtwork } from "@/types/library";

interface SteamSearchHit {
  appid?: number | string;
  id?: number | string;
  name?: string;
  tiny_image?: string;
}

interface SteamStoreSearch {
  items?: SteamSearchHit[];
}

interface SteamAppDetails {
  [appId: string]: {
    success?: boolean;
    data?: {
      name?: string;
      header_image?: string;
      capsule_image?: string;
      capsule_imagev5?: string;
      screenshots?: Array<{ path_thumbnail?: string; path_full?: string }>;
    };
  };
}

export function steamCdnArt(appId: number): Pick<RemoteArtwork, "coverUrl" | "bannerUrl" | "logoUrl"> {
  const base = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}`;
  return {
    coverUrl: `${base}/library_600x900.jpg`,
    bannerUrl: `${base}/library_hero.jpg`,
    logoUrl: `${base}/logo.png`,
  };
}

function parseAppId(value: number | string | undefined): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function resolveSteamAppId(name: string): Promise<number | null> {
  const known = knownSteamAppId(name);
  if (known) {
    return known;
  }
  if (isEpicOnlyTitle(name)) {
    return null;
  }

  const query = name.replace(/[™®©]/g, "").trim();
  if (!query) {
    return null;
  }

  try {
    const store = await fetchRemoteJson<SteamStoreSearch>({
      url: `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`,
    });
    const items = store.items ?? [];
    const match =
      items.find((item) => item.name && titlesLikelyMatch(query, item.name)) ??
      (items.length === 1 ? items[0] : undefined);
    const id = parseAppId(match?.id ?? match?.appid);
    if (id) {
      return id;
    }
  } catch (error) {
    console.warn("Steam store search failed", error);
  }

  const hits = await fetchRemoteJson<SteamSearchHit[]>({
    url: `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(query)}`,
  });
  const match =
    hits.find((item) => item.name && titlesLikelyMatch(query, item.name)) ??
    (hits.length === 1 ? hits[0] : undefined);
  return parseAppId(match?.appid ?? match?.id);
}

export async function fetchSteamMetadata(
  name: string,
  knownAppId?: number | null,
): Promise<RemoteArtwork | null> {
  const appId = knownAppId && knownAppId > 0 ? knownAppId : await resolveSteamAppId(name);
  if (!appId) {
    return null;
  }

  try {
    const details = await fetchRemoteJson<SteamAppDetails>({
      url: `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english`,
    });
    const data = details[String(appId)]?.data;
    if (data?.header_image || data?.capsule_image) {
      return {
        coverUrl: data.header_image ?? data.capsule_image ?? null,
        bannerUrl: data.header_image ?? data.screenshots?.[0]?.path_full ?? null,
        logoUrl: data.capsule_image ?? data.capsule_imagev5 ?? null,
        description: null,
        steamAppId: appId,
        source: "steam",
      };
    }
  } catch (error) {
    console.warn("Steam appdetails failed", error);
  }

  const art = steamCdnArt(appId);
  return {
    coverUrl: art.coverUrl,
    bannerUrl: art.bannerUrl,
    logoUrl: art.logoUrl,
    description: null,
    steamAppId: appId,
    source: "steam",
  };
}
