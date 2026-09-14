import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/lib/runtime";
import { knownSteamAppId } from "@/services/metadata/aliases";
import { knownArtFor } from "@/services/metadata/knownArt";
import { getMetadataConfig } from "@/services/metadata/config";
import { fetchEpicMetadata } from "@/services/metadata/epic";
import { fetchIgdbMetadata } from "@/services/metadata/igdb";
import { fetchSteamMetadata } from "@/services/metadata/steam";
import { fetchSteamGridDbArtwork } from "@/services/metadata/steamgriddb";
import { fetchWikiArtwork } from "@/services/metadata/wiki";
import { fetchXboxMetadata } from "@/services/metadata/xbox";
import type { LibraryGame, MetadataSource, RemoteArtwork } from "@/types/library";

export type { RemoteArtwork } from "@/types/library";
export { getMetadataConfig, setMetadataConfig } from "@/services/metadata/config";

const ENRICH_CONCURRENCY = 2;

export function needsMetadata(game: LibraryGame): boolean {
  return !game.coverPath && !game.bannerPath;
}

export async function fetchGameMetadata(
  name: string,
  knownAppId?: number | null,
): Promise<RemoteArtwork> {
  const config = getMetadataConfig();
  let artwork: RemoteArtwork = {
    coverUrl: null,
    bannerUrl: null,
    logoUrl: null,
    description: null,
    steamAppId: knownAppId && knownAppId > 0 ? knownAppId : null,
    source: "none",
  };
  const sources: MetadataSource[] = [];

  try {
    const steam = await fetchSteamMetadata(name, knownAppId ?? knownSteamAppId(name));
    if (steam) {
      artwork = { ...artwork, ...steam };
      sources.push("steam");
    }
  } catch (error) {
    console.warn("Steam metadata failed", error);
  }

  if (!artwork.coverUrl || !artwork.bannerUrl) {
    try {
      const epic = await fetchEpicMetadata(name);
      if (epic) {
        artwork = {
          ...artwork,
          coverUrl: artwork.coverUrl ?? epic.coverUrl,
          bannerUrl: artwork.bannerUrl ?? epic.bannerUrl,
          logoUrl: artwork.logoUrl ?? epic.logoUrl,
        };
        sources.push("steam");
      }
    } catch (error) {
      console.warn("Epic metadata failed", error);
    }
  }

  if (!artwork.coverUrl || !artwork.bannerUrl) {
    try {
      const xbox = await fetchXboxMetadata(name);
      if (xbox) {
        artwork = {
          ...artwork,
          coverUrl: artwork.coverUrl ?? xbox.coverUrl,
          bannerUrl: artwork.bannerUrl ?? xbox.bannerUrl,
          logoUrl: artwork.logoUrl ?? xbox.logoUrl,
        };
        sources.push("steam");
      }
    } catch (error) {
      console.warn("Xbox metadata failed", error);
    }
  }

  if (!artwork.coverUrl || !artwork.bannerUrl) {
    try {
      const wiki = await fetchWikiArtwork(name);
      if (wiki) {
        artwork = {
          ...artwork,
          coverUrl: artwork.coverUrl ?? wiki.coverUrl,
          bannerUrl: artwork.bannerUrl ?? wiki.bannerUrl,
        };
        sources.push("steam");
      }
    } catch (error) {
      console.warn("Wikipedia artwork failed", error);
    }
  }

  try {
    const grid = await fetchSteamGridDbArtwork(name, config.steamGridDbKey);
    if (grid) {
      artwork = {
        ...artwork,
        coverUrl: grid.coverUrl ?? artwork.coverUrl,
        bannerUrl: grid.bannerUrl ?? artwork.bannerUrl,
        logoUrl: grid.logoUrl ?? artwork.logoUrl,
      };
      sources.push("steamgriddb");
    }
  } catch (error) {
    console.warn("SteamGridDB metadata failed", error);
  }

  if (!artwork.coverUrl || !artwork.description) {
    try {
      const igdb = await fetchIgdbMetadata(name, config.igdbClientId, config.igdbClientSecret);
      if (igdb) {
        artwork = {
          ...artwork,
          coverUrl: artwork.coverUrl ?? igdb.coverUrl,
          bannerUrl: artwork.bannerUrl ?? igdb.bannerUrl,
          description: artwork.description ?? igdb.description,
        };
        sources.push("igdb");
      }
    } catch (error) {
      console.warn("IGDB metadata failed", error);
    }
  }

  if (!artwork.coverUrl || !artwork.bannerUrl) {
    const known = knownArtFor(name);
    if (known) {
      artwork = {
        ...artwork,
        coverUrl: artwork.coverUrl ?? known.cover,
        bannerUrl: artwork.bannerUrl ?? known.banner,
        logoUrl: artwork.logoUrl ?? known.icon,
      };
      if (artwork.source === "none") {
        sources.push("steam");
      }
    }
  }

  artwork.source = sources.length > 1 ? "mixed" : (sources[0] ?? "none");
  return artwork;
}

export async function cacheGameArtwork(
  gameId: string,
  artwork: RemoteArtwork,
): Promise<LibraryGame> {
  if (!isTauriRuntime()) {
    throw new Error("Artwork caching requires the Tauri runtime");
  }

  return invoke<LibraryGame>("cache_game_artwork", {
    request: {
      gameId,
      coverUrl: artwork.coverUrl,
      bannerUrl: artwork.bannerUrl,
      logoUrl: artwork.logoUrl,
      description: artwork.description,
      metadataSource: artwork.source,
      steamAppId: artwork.steamAppId,
    },
  });
}

export async function enrichGame(game: LibraryGame): Promise<LibraryGame> {
  const knownId = game.steamAppId ?? knownSteamAppId(game.name);
  const artwork = await fetchGameMetadata(game.name, knownId);
  if (!artwork.steamAppId && knownId) {
    artwork.steamAppId = knownId;
  }
  return cacheGameArtwork(game.id, artwork);
}

export async function enrichLibrary(
  games: LibraryGame[],
  onGame: (game: LibraryGame) => void,
): Promise<void> {
  const pending = games.filter(needsMetadata);
  const queue = [...pending];

  const workers = Array.from({ length: Math.min(ENRICH_CONCURRENCY, queue.length) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) {
        return;
      }
      try {
        onGame(await enrichGame(next));
      } catch (error) {
        console.warn(`Metadata enrich failed for ${next.name}`, error);
        try {
          onGame(
            await cacheGameArtwork(next.id, {
              coverUrl: null,
              bannerUrl: null,
              logoUrl: null,
              description: null,
              steamAppId: knownSteamAppId(next.name),
              source: "none",
            }),
          );
        } catch {
          // Keep the card visible even if the cache write fails.
        }
      }
    }
  });

  await Promise.all(workers);
}
