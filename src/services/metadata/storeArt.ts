import { isEpicOnlyTitle } from "@/services/metadata/aliases";
import { fetchRemoteJson } from "@/services/metadata/http";
import type { SteamArtKind } from "@/lib/steamArt";

export interface LiveArt {
  icon: string | null;
  cover: string | null;
  banner: string | null;
}

interface SteamAppDetails {
  [appId: string]: {
    success?: boolean;
    data?: {
      header_image?: string;
      capsule_image?: string;
      capsule_imagev5?: string;
      screenshots?: Array<{ path_thumbnail?: string; path_full?: string }>;
    };
  };
}

interface FortniteNews {
  data?: {
    br?: {
      motds?: Array<{ image?: string; tileImage?: string }>;
    };
  };
}

const steamCache = new Map<number, LiveArt>();
const steamInflight = new Map<number, Promise<LiveArt | null>>();
let fortniteArt: LiveArt | null = null;
let fortniteInflight: Promise<LiveArt | null> | null = null;

export function peekSteamArt(appId: number): LiveArt | null {
  return steamCache.get(appId) ?? null;
}

export async function loadSteamArt(appId: number): Promise<LiveArt | null> {
  const cached = steamCache.get(appId);
  if (cached) {
    return cached;
  }
  const pending = steamInflight.get(appId);
  if (pending) {
    return pending;
  }

  const request = fetchRemoteJson<SteamAppDetails>({
    url: `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english`,
  })
    .then((details) => {
      const data = details[String(appId)]?.data;
      if (!data) {
        return null;
      }
      const art: LiveArt = {
        icon: data.capsule_image ?? data.capsule_imagev5 ?? data.header_image ?? null,
        cover: data.header_image ?? data.capsule_image ?? data.screenshots?.[0]?.path_full ?? null,
        banner: data.header_image ?? data.screenshots?.[0]?.path_full ?? null,
      };
      steamCache.set(appId, art);
      return art;
    })
    .catch((error) => {
      console.warn(`Steam store art failed for ${appId}`, error);
      return null;
    })
    .finally(() => {
      steamInflight.delete(appId);
    });

  steamInflight.set(appId, request);
  return request;
}

export async function loadFortniteArt(): Promise<LiveArt | null> {
  if (fortniteArt) {
    return fortniteArt;
  }
  if (fortniteInflight) {
    return fortniteInflight;
  }

  fortniteInflight = fetchRemoteJson<FortniteNews>({
    url: "https://fortnite-api.com/v2/news",
  })
    .then((payload) => {
      const motd = payload.data?.br?.motds?.[0];
      const image = motd?.tileImage ?? motd?.image;
      if (!image) {
        return null;
      }
      fortniteArt = { icon: image, cover: image, banner: image };
      return fortniteArt;
    })
    .catch((error) => {
      console.warn("Fortnite art failed", error);
      return null;
    })
    .finally(() => {
      fortniteInflight = null;
    });

  return fortniteInflight;
}

export function liveArtUrls(art: LiveArt | null, kind: SteamArtKind): string[] {
  if (!art) {
    return [];
  }
  if (kind === "banner" || kind === "header") {
    return [art.banner, art.cover, art.icon].filter((url): url is string => Boolean(url));
  }
  if (kind === "logo") {
    return [art.icon].filter((url): url is string => Boolean(url));
  }
  return [art.icon, art.cover, art.banner].filter((url): url is string => Boolean(url));
}

export async function loadLiveArt(
  name: string,
  appId: number | null,
): Promise<LiveArt | null> {
  if (appId && appId > 0) {
    return loadSteamArt(appId);
  }
  if (isEpicOnlyTitle(name)) {
    return loadFortniteArt();
  }
  return null;
}
