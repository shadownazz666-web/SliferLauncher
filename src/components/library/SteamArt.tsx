import { useEffect, useState } from "react";
import { gameArtUrls, resolvedSteamAppId, type SteamArtKind } from "@/lib/steamArt";
import { liveArtUrls, loadLiveArt } from "@/services/metadata/storeArt";
import { cn } from "@/lib/cn";
import type { LibraryGame } from "@/types/library";

interface SteamArtProps {
  game: LibraryGame;
  kind: SteamArtKind;
  alt?: string;
  className?: string;
  fallback?: string | null;
}

export function SteamArt({ game, kind, alt = "", className, fallback = null }: SteamArtProps) {
  const [live, setLive] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const urls = unique([
    ...gameArtUrls(game, kind),
    ...live,
  ]);

  const artKey = `${game.id}:${kind}:${game.steamAppId ?? ""}:${game.coverPath ?? ""}:${game.bannerPath ?? ""}:${live.join("|")}`;

  useEffect(() => {
    setIndex(0);
  }, [artKey]);

  useEffect(() => {
    let cancelled = false;
    void loadLiveArt(game.name, resolvedSteamAppId(game)).then((art) => {
      if (!cancelled) {
        setLive(liveArtUrls(art, kind));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [game.id, game.name, game.steamAppId, kind]);

  const src = urls[index];
  if (!src) {
    return fallback ? <span className={className}>{fallback}</span> : null;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn("object-cover", className)}
      draggable={false}
      onError={() => setIndex((current) => current + 1)}
    />
  );
}

function unique(urls: string[]): string[] {
  return [...new Set(urls.filter(Boolean))];
}
