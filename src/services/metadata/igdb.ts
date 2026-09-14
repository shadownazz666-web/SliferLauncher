import { fetchRemoteJson, fetchRemoteText } from "@/services/metadata/http";
import { titlesLikelyMatch } from "@/services/metadata/match";
import type { RemoteArtwork } from "@/types/library";

interface TwitchToken {
  access_token?: string;
}

interface IgdbGame {
  name?: string;
  summary?: string;
  cover?: { image_id?: string };
  screenshots?: Array<{ image_id?: string }>;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function igdbImage(imageId: string, size: string): string {
  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg`;
}

async function twitchToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const payload = await fetchRemoteJson<TwitchToken>({
    url: `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`,
    method: "POST",
  });
  if (!payload.access_token) {
    throw new Error("IGDB token request failed");
  }

  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + 50 * 60 * 1000,
  };
  return payload.access_token;
}

export async function fetchIgdbMetadata(
  name: string,
  clientId: string,
  clientSecret: string,
): Promise<RemoteArtwork | null> {
  if (!clientId || !clientSecret) {
    return null;
  }

  const token = await twitchToken(clientId, clientSecret);
  const body = `search "${name.replace(/"/g, "")}"; fields name,summary,cover.image_id,screenshots.image_id; limit 5;`;
  const text = await fetchRemoteText({
    url: "https://api.igdb.com/v4/games",
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  });
  const games = JSON.parse(text) as IgdbGame[];
  const match = games.find((game) => game.name && titlesLikelyMatch(name, game.name));
  if (!match) {
    return null;
  }

  return {
    coverUrl: match.cover?.image_id ? igdbImage(match.cover.image_id, "t_cover_big_2x") : null,
    bannerUrl: match.screenshots?.[0]?.image_id
      ? igdbImage(match.screenshots[0].image_id, "t_1080p")
      : null,
    logoUrl: null,
    description: match.summary ?? null,
    steamAppId: null,
    source: "igdb",
  };
}
