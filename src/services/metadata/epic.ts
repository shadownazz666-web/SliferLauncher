import { fetchRemoteJson } from "@/services/metadata/http";
import { titlesLikelyMatch } from "@/services/metadata/match";
import type { RemoteArtwork } from "@/types/library";

interface EpicImage {
  type?: string;
  url?: string;
}

interface EpicElement {
  title?: string;
  keyImages?: EpicImage[];
}

interface EpicSearchResponse {
  data?: {
    Catalog?: {
      searchStore?: {
        elements?: EpicElement[];
      };
    };
  };
}

const SEARCH_QUERY = `
query ($keywords: String!) {
  Catalog {
    searchStore(keywords: $keywords, country: "US", locale: "en-US", count: 8) {
      elements {
        title
        keyImages { type url }
      }
    }
  }
}
`;

export async function fetchEpicMetadata(name: string): Promise<RemoteArtwork | null> {
  const payload = await fetchRemoteJson<EpicSearchResponse>({
    url: "https://store.epicgames.com/graphql",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: { keywords: name },
    }),
  });

  const elements = payload.data?.Catalog?.searchStore?.elements ?? [];
  const match =
    elements.find((item) => item.title && titlesLikelyMatch(name, item.title)) ?? elements[0];
  if (!match?.keyImages?.length) {
    return null;
  }

  return {
    coverUrl: pickImage(match.keyImages, ["OfferImageTall", "DieselStoreFrontTall", "Thumbnail"]),
    bannerUrl: pickImage(match.keyImages, [
      "OfferImageWide",
      "DieselStoreFrontWide",
      "Featured",
      "DieselGameBoxWide",
    ]),
    logoUrl: pickImage(match.keyImages, ["Logo"]),
    description: null,
    steamAppId: null,
    source: "steam",
  };
}

function pickImage(images: EpicImage[], types: string[]): string | null {
  for (const type of types) {
    const hit = images.find((image) => image.type === type && image.url);
    if (hit?.url) {
      return hit.url;
    }
  }
  return images.find((image) => image.url)?.url ?? null;
}
