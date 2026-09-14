import { toAssetUrl } from "@/lib/assetUrl";
import { knownSteamAppId } from "@/services/metadata/aliases";
import { knownArtUrls } from "@/services/metadata/knownArt";
import type { LibraryGame } from "@/types/library";

const CDN_HOSTS = [
  "https://cdn.cloudflare.steamstatic.com/steam/apps",
  "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps",
  "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps",
  "https://steamcdn-a.akamaihd.net/steam/apps",
] as const;

export type SteamArtKind = "icon" | "cover" | "banner" | "logo" | "header";

const FILES: Record<SteamArtKind, string[]> = {
  icon: [
    "capsule_231x87.jpg",
    "capsule_184x69.jpg",
    "hero_capsule.jpg",
    "library_capsule.jpg",
    "library_600x900.jpg",
    "header.jpg",
    "capsule_616x353.jpg",
  ],
  cover: ["library_600x900.jpg", "library_capsule.jpg", "portrait.png", "header.jpg"],
  banner: ["library_hero.jpg", "library_hero.png", "header.jpg", "capsule_616x353.jpg"],
  logo: ["logo.png", "logo_2x.png"],
  header: ["header.jpg"],
};

export function resolvedSteamAppId(game: Pick<LibraryGame, "name" | "steamAppId">): number | null {
  if (game.steamAppId && game.steamAppId > 0) {
    return game.steamAppId;
  }
  return knownSteamAppId(game.name);
}

export function hasSteamAppId(game: Pick<LibraryGame, "name" | "steamAppId">): boolean {
  return resolvedSteamAppId(game) != null;
}

export function steamArtUrls(appId: number, kind: SteamArtKind): string[] {
  const files = FILES[kind];
  const urls: string[] = [];
  for (const host of CDN_HOSTS) {
    for (const file of files) {
      urls.push(`${host}/${appId}/${file}`);
    }
  }
  return urls;
}

export function gameArtUrls(game: LibraryGame, kind: SteamArtKind): string[] {
  const local = localArt(game, kind);
  const known = knownArtUrls(game.name, kind);
  const appId = resolvedSteamAppId(game);
  const remote = appId ? steamArtUrls(appId, kind) : [];
  const urls = [local, ...known, ...remote].filter((url): url is string => Boolean(url));
  return [...new Set(urls)];
}

function localArt(game: LibraryGame, kind: SteamArtKind): string | null {
  if (kind === "banner") {
    return toAssetUrl(game.bannerPath) ?? toAssetUrl(game.coverPath);
  }
  if (kind === "logo") {
    return toAssetUrl(game.logoPath);
  }
  if (kind === "icon") {
    return toAssetUrl(game.coverPath) ?? toAssetUrl(game.bannerPath);
  }
  return toAssetUrl(game.coverPath) ?? toAssetUrl(game.bannerPath);
}

export function steamStoreUrl(appId: number): string {
  return `https://store.steampowered.com/app/${appId}/`;
}
