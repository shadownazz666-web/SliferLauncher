import { fetchRemoteJson } from "@/services/metadata/http";
import { prepareUpdateHtml, summarizeHtml } from "@/services/updates/content";
import type { UpdateItem } from "@/types/updates";

interface SteamNewsResponse {
  appnews?: {
    newsitems?: SteamNewsItem[];
  };
}

interface SteamNewsItem {
  gid?: string;
  title?: string;
  url?: string;
  author?: string;
  contents?: string;
  feedlabel?: string;
  date?: number;
}

const NEWS_COUNT = 8;

export async function fetchSteamNews(
  gameId: string,
  gameName: string,
  appId: number,
): Promise<UpdateItem[]> {
  const payload = await fetchRemoteJson<SteamNewsResponse>({
    url: `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${appId}&count=${NEWS_COUNT}&maxlength=0&format=json`,
  });

  return (payload.appnews?.newsitems ?? [])
    .map((item) => mapSteamItem(gameId, gameName, item))
    .filter((item): item is UpdateItem => item !== null);
}

function mapSteamItem(
  gameId: string,
  gameName: string,
  item: SteamNewsItem,
): UpdateItem | null {
  const gid = item.gid?.trim();
  const title = item.title?.trim();
  const url = item.url?.trim();
  if (!gid || !title || !url) {
    return null;
  }

  const html = prepareUpdateHtml(item.contents ?? "");
  const publishedUnix = item.date ?? 0;

  return {
    id: `steam:${gid}`,
    gameId,
    gameName,
    title,
    author: item.author?.trim() || "Steam",
    publishedAt: new Date(publishedUnix * 1000).toISOString(),
    publishedUnix,
    summary: summarizeHtml(html || title),
    html,
    url,
    source: "steam",
    feedLabel: item.feedlabel?.trim() || "Steam News",
  };
}
