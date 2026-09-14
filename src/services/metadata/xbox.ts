import { fetchRemoteJson } from "@/services/metadata/http";
import { titlesLikelyMatch } from "@/services/metadata/match";
import type { RemoteArtwork } from "@/types/library";

interface XboxImage {
  ImageType?: string;
  Uri?: string;
}

interface XboxProduct {
  LocalizedProperties?: Array<{
    ProductTitle?: string;
    Images?: XboxImage[];
  }>;
}

interface XboxSearchResponse {
  ResultSets?: Array<{
    Suggests?: Array<{
      Title?: string;
      ImageUrl?: string;
      Metas?: Array<{ Key?: string; Value?: string }>;
    }>;
  }>;
}

interface XboxProductResponse {
  Products?: XboxProduct[];
}

export async function fetchXboxMetadata(name: string): Promise<RemoteArtwork | null> {
  const suggest = await fetchRemoteJson<XboxSearchResponse>({
    url: `https://www.microsoft.com/msstoreapiprod/api/autosuggest?market=en-us&clientId=7F27B536-CF6B-4C47-8B31-86A57D6BDF17&sources=Microsoft-Terms%2CIris-Products%2CDcatall-Products&query=${encodeURIComponent(name)}`,
  });

  const hit = suggest.ResultSets?.flatMap((set) => set.Suggests ?? []).find(
    (item) => item.Title && titlesLikelyMatch(name, item.Title),
  );
  const productId = hit?.Metas?.find((meta) => meta.Key === "BigCatalogId")?.Value;

  if (productId) {
    const details = await fetchRemoteJson<XboxProductResponse>({
      url: `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${encodeURIComponent(productId)}&market=US&languages=en-US`,
    });
    const images = details.Products?.[0]?.LocalizedProperties?.[0]?.Images ?? [];
    const cover = pickXboxImage(images, ["Poster", "BoxArt", "BrandedKeyArt"]);
    const banner = pickXboxImage(images, ["SuperHeroArt", "Hero", "TitledHeroArt", "WideBackgroundImage"]);
    if (cover || banner) {
      return {
        coverUrl: cover,
        bannerUrl: banner ?? cover,
        logoUrl: pickXboxImage(images, ["Logo", "Tile"]),
        description: null,
        steamAppId: null,
        source: "steam",
      };
    }
  }

  if (hit?.ImageUrl) {
    return {
      coverUrl: hit.ImageUrl,
      bannerUrl: hit.ImageUrl,
      logoUrl: null,
      description: null,
      steamAppId: null,
      source: "steam",
    };
  }

  return null;
}

function pickXboxImage(images: XboxImage[], types: string[]): string | null {
  for (const type of types) {
    const hit = images.find((image) => image.ImageType === type && image.Uri);
    if (hit?.Uri) {
      return hit.Uri;
    }
  }
  return null;
}
