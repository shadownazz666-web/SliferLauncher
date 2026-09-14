import { normalizeTitle } from "@/services/metadata/match";
import { fetchRemoteJson } from "@/services/metadata/http";
import type { RemoteArtwork } from "@/types/library";

interface WikiSummary {
  title?: string;
  originalimage?: { source?: string };
  thumbnail?: { source?: string };
}

interface WikiSearch {
  query?: {
    search?: Array<{ title?: string }>;
  };
}

const WIKI_TITLES: Record<string, string> = {
  fortnite: "Fortnite",
  "fall guys": "Fall Guys",
  "forza horizon 6": "Forza Horizon 6",
  overwatch: "Overwatch 2",
  "overwatch 2": "Overwatch 2",
  inzoi: "InZOI",
  "resident evil village": "Resident Evil Village",
  "meccha chameleon": "MECCHA CHAMELEON",
};

export async function fetchWikiArtwork(name: string): Promise<RemoteArtwork | null> {
  const preferred = WIKI_TITLES[normalizeTitle(name)] ?? name.replace(/[™®©]/g, "").trim();
  const titles = [preferred];
  if (preferred !== `${preferred} (video game)`) {
    titles.push(`${preferred} (video game)`);
  }

  for (const title of titles) {
    const art = await summaryImage(title);
    if (art) {
      return art;
    }
  }

  const searched = await searchWikiTitle(preferred);
  if (searched && !titles.includes(searched)) {
    return summaryImage(searched);
  }
  return null;
}

async function searchWikiTitle(name: string): Promise<string | null> {
  try {
    const result = await fetchRemoteJson<WikiSearch>({
      url: `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=1&format=json&origin=*`,
    });
    return result.query?.search?.[0]?.title ?? null;
  } catch {
    return null;
  }
}

interface WikiPageImage {
  query?: {
    pages?: Record<string, { original?: { source?: string }; thumbnail?: { source?: string } }>;
  };
}

async function summaryImage(title: string): Promise<RemoteArtwork | null> {
  try {
    const summary = await fetchRemoteJson<WikiSummary>({
      url: `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    });
    const image = summary.originalimage?.source ?? summary.thumbnail?.source;
    if (image) {
      return remoteArt(image);
    }
  } catch {
    // Try the older query API below.
  }

  try {
    const page = await fetchRemoteJson<WikiPageImage>({
      url: `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=original|thumbnail&pithumbsize=600&titles=${encodeURIComponent(title)}&format=json&origin=*`,
    });
    const first = Object.values(page.query?.pages ?? {})[0];
    const image = first?.original?.source ?? first?.thumbnail?.source;
    if (image) {
      return remoteArt(image);
    }
  } catch {
    return null;
  }
  return null;
}

function remoteArt(image: string): RemoteArtwork {
  return {
    coverUrl: image,
    bannerUrl: image,
    logoUrl: null,
    description: null,
    steamAppId: null,
    source: "steam",
  };
}
