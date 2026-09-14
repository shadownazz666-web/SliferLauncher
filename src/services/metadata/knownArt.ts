import { normalizeTitle } from "@/services/metadata/match";

export interface KnownArt {
  icon: string;
  cover: string;
  banner: string;
}

const KNOWN_ART: Record<string, KnownArt> = {
  fortnite: {
    icon: "https://cdn-live.prm.ol.epicgames.com/prod/f2218cc9e09e4a308e3a7b8d47df3529.jpeg?width=256&height=256&aspect=fill",
    cover: "https://cdn-live.prm.ol.epicgames.com/prod/f2218cc9e09e4a308e3a7b8d47df3529.jpeg?width=600&height=900&aspect=fill",
    banner: "https://cdn-live.prm.ol.epicgames.com/prod/f2218cc9e09e4a308e3a7b8d47df3529.jpeg?width=1920&height=620&aspect=fill",
  },
  "forza horizon 6": {
    icon: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2483190/efa5dfac82e658e18e16e508639dfae2284d88ab/capsule_231x87_alt_assets_3.jpg",
    cover: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2483190/aec13616ef2adf9908ab2bf185f6e0557d6603ef/header_alt_assets_3.jpg",
    banner: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2483190/aec13616ef2adf9908ab2bf185f6e0557d6603ef/header_alt_assets_3.jpg",
  },
  "resident evil requiem": {
    icon: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3764200/64f506b9b6210df6055136e7017f2082957e5b22/capsule_231x87.jpg",
    cover: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3764200/ce5437442768e38eb575f205ab9397d0264017b0/header.jpg",
    banner: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3764200/ce5437442768e38eb575f205ab9397d0264017b0/header.jpg",
  },
  "resident evil 9": {
    icon: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3764200/64f506b9b6210df6055136e7017f2082957e5b22/capsule_231x87.jpg",
    cover: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3764200/ce5437442768e38eb575f205ab9397d0264017b0/header.jpg",
    banner: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3764200/ce5437442768e38eb575f205ab9397d0264017b0/header.jpg",
  },
};

export function knownArtFor(name: string): KnownArt | null {
  const key = normalizeTitle(name);
  if (KNOWN_ART[key]) {
    return KNOWN_ART[key];
  }
  for (const [alias, art] of Object.entries(KNOWN_ART)) {
    if (key.startsWith(`${alias} `) || alias.startsWith(`${key} `) || key.replace(/\s+/g, "") === alias.replace(/\s+/g, "")) {
      return art;
    }
  }
  return null;
}

export function knownArtUrls(
  name: string,
  kind: "icon" | "cover" | "banner" | "logo" | "header",
): string[] {
  const art = knownArtFor(name);
  if (!art) {
    return [];
  }
  if (kind === "banner" || kind === "header") {
    return [art.banner, art.cover, art.icon];
  }
  if (kind === "logo") {
    return [art.icon];
  }
  return [art.icon, art.cover, art.banner];
}
