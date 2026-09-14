import { resolveSteamAppId } from "@/services/metadata/steam";
import { fetchSteamRssNews } from "@/services/updates/rss";
import { fetchSteamNews } from "@/services/updates/steamNews";
import type { LibraryGame } from "@/types/library";
import type { UpdateItem } from "@/types/updates";

const FETCH_CONCURRENCY = 3;

export interface FeedProgress {
  fetched: number;
  total: number;
  gameName: string;
}

export async function aggregateUpdates(
  games: LibraryGame[],
  resolvedAppIds: Record<string, number>,
  onResolvedAppId?: (gameId: string, appId: number) => void,
  onProgress?: (progress: FeedProgress) => void,
): Promise<UpdateItem[]> {
  const queue = [...games];
  const collected: UpdateItem[] = [];
  let fetched = 0;

  const workers = Array.from(
    { length: Math.min(FETCH_CONCURRENCY, queue.length) },
    async () => {
      while (queue.length > 0) {
        const game = queue.shift();
        if (!game) {
          return;
        }

        try {
          const items = await fetchUpdatesForGame(game, resolvedAppIds, onResolvedAppId);
          collected.push(...items);
        } catch (error) {
          console.warn(`Updates feed failed for ${game.name}`, error);
        } finally {
          fetched += 1;
          onProgress?.({
            fetched,
            total: games.length,
            gameName: game.name,
          });
        }
      }
    },
  );

  await Promise.all(workers);
  return collected.sort((left, right) => right.publishedUnix - left.publishedUnix);
}

async function fetchUpdatesForGame(
  game: LibraryGame,
  resolvedAppIds: Record<string, number>,
  onResolvedAppId?: (gameId: string, appId: number) => void,
): Promise<UpdateItem[]> {
  const appId = await resolveAppId(game, resolvedAppIds, onResolvedAppId);
  if (!appId) {
    return [];
  }

  try {
    const steam = await fetchSteamNews(game.id, game.name, appId);
    if (steam.length > 0) {
      return steam;
    }
  } catch (error) {
    console.warn(`Steam news failed for ${game.name}`, error);
  }

  try {
    return await fetchSteamRssNews(game.id, game.name, appId);
  } catch (error) {
    console.warn(`RSS news failed for ${game.name}`, error);
    return [];
  }
}

async function resolveAppId(
  game: LibraryGame,
  resolvedAppIds: Record<string, number>,
  onResolvedAppId?: (gameId: string, appId: number) => void,
): Promise<number | null> {
  if (game.steamAppId && game.steamAppId > 0) {
    return game.steamAppId;
  }
  if (resolvedAppIds[game.id]) {
    return resolvedAppIds[game.id];
  }

  const appId = await resolveSteamAppId(game.name);
  if (appId) {
    onResolvedAppId?.(game.id, appId);
  }
  return appId;
}
