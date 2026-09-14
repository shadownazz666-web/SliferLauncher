import { fetchRemoteJson } from "@/services/metadata/http";
import { titlesLikelyMatch } from "@/services/metadata/match";
import type { RemoteArtwork } from "@/types/library";

interface SteamGridSearch {
  success?: boolean;
  data?: Array<{ id: number; name: string }>;
}

interface SteamGridList {
  success?: boolean;
  data?: Array<{ url?: string }>;
}

function authHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}

async function firstAsset(apiKey: string, path: string): Promise<string | null> {
  const payload = await fetchRemoteJson<SteamGridList>({
    url: `https://www.steamgriddb.com/api/v2/${path}`,
    headers: authHeaders(apiKey),
  });
  return payload.data?.find((item) => item.url)?.url ?? null;
}

export async function fetchSteamGridDbArtwork(
  name: string,
  apiKey: string,
): Promise<Partial<RemoteArtwork> | null> {
  if (!apiKey) {
    return null;
  }

  const search = await fetchRemoteJson<SteamGridSearch>({
    url: `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(name)}`,
    headers: authHeaders(apiKey),
  });
  const match = search.data?.find((item) => titlesLikelyMatch(name, item.name));
  if (!match) {
    return null;
  }

  const [coverUrl, bannerUrl, logoUrl] = await Promise.all([
    firstAsset(apiKey, `grids/game/${match.id}?dimensions=600x900,342x482&types=static`),
    firstAsset(apiKey, `heroes/game/${match.id}?types=static`),
    firstAsset(apiKey, `logos/game/${match.id}`),
  ]);

  if (!coverUrl && !bannerUrl && !logoUrl) {
    return null;
  }

  return {
    coverUrl,
    bannerUrl,
    logoUrl,
    source: "steamgriddb",
  };
}
