import { fetchRemoteText } from "@/services/metadata/http";
import { prepareUpdateHtml, summarizeHtml } from "@/services/updates/content";
import type { UpdateItem } from "@/types/updates";

const MAX_ITEMS = 8;

export async function fetchSteamRssNews(
  gameId: string,
  gameName: string,
  appId: number,
): Promise<UpdateItem[]> {
  const xml = await fetchRemoteText({
    url: `https://store.steampowered.com/feeds/news/app/${appId}/?cc=US&l=english`,
  });
  return parseFeedXml(xml, gameId, gameName, "rss");
}

export function parseFeedXml(
  xml: string,
  gameId: string,
  gameName: string,
  source: "rss",
): UpdateItem[] {
  if (typeof DOMParser === "undefined") {
    return [];
  }

  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.querySelector("parsererror")) {
    return [];
  }

  const rssItems = Array.from(doc.querySelectorAll("channel > item"));
  if (rssItems.length > 0) {
    return rssItems.slice(0, MAX_ITEMS).flatMap((node, index) => {
      const item = mapRssItem(node, gameId, gameName, source, index);
      return item ? [item] : [];
    });
  }

  return Array.from(doc.querySelectorAll("entry"))
    .slice(0, MAX_ITEMS)
    .flatMap((node, index) => {
      const item = mapAtomItem(node, gameId, gameName, source, index);
      return item ? [item] : [];
    });
}

function mapRssItem(
  node: Element,
  gameId: string,
  gameName: string,
  source: "rss",
  index: number,
): UpdateItem | null {
  const title = textOf(node, "title");
  const url = textOf(node, "link");
  if (!title || !url) {
    return null;
  }

  const raw = firstText(node, ["content:encoded", "description"]) ?? "";
  const html = prepareUpdateHtml(raw);
  const published = Date.parse(textOf(node, "pubDate") ?? "") || Date.now();
  const author = textOf(node, "dc:creator") || textOf(node, "author") || "RSS";

  return {
    id: `rss:${hashKey(url, title, index)}`,
    gameId,
    gameName,
    title,
    author,
    publishedAt: new Date(published).toISOString(),
    publishedUnix: Math.floor(published / 1000),
    summary: summarizeHtml(html || title),
    html,
    url,
    source,
    feedLabel: "RSS",
  };
}

function mapAtomItem(
  node: Element,
  gameId: string,
  gameName: string,
  source: "rss",
  index: number,
): UpdateItem | null {
  const title = textOf(node, "title");
  const url =
    node.querySelector("link[href]")?.getAttribute("href") ?? textOf(node, "link");
  if (!title || !url) {
    return null;
  }

  const raw = firstText(node, ["content", "summary"]) ?? "";
  const html = prepareUpdateHtml(raw);
  const published =
    Date.parse(textOf(node, "updated") ?? textOf(node, "published") ?? "") || Date.now();
  const author = node.querySelector("author > name")?.textContent?.trim() || "RSS";

  return {
    id: `rss:${hashKey(url, title, index)}`,
    gameId,
    gameName,
    title,
    author,
    publishedAt: new Date(published).toISOString(),
    publishedUnix: Math.floor(published / 1000),
    summary: summarizeHtml(html || title),
    html,
    url,
    source,
    feedLabel: "Atom",
  };
}

function textOf(node: Element, tagName: string): string | null {
  const value = node.getElementsByTagName(tagName)[0]?.textContent?.trim();
  return value || null;
}

function firstText(node: Element, tagNames: string[]): string | null {
  for (const tagName of tagNames) {
    const value = textOf(node, tagName);
    if (value) {
      return value;
    }
  }
  return null;
}

function hashKey(url: string, title: string, index: number): string {
  return `${url}|${title}|${index}`;
}
