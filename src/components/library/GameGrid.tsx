import { motion } from "framer-motion";
import { Clock3, Gamepad2, Heart } from "lucide-react";
import { useState } from "react";
import { toAssetUrl } from "@/lib/assetUrl";
import {
  formatLastPlayed,
  formatPlaytime,
  platformAccent,
} from "@/lib/libraryDisplay";
import { gameTitle } from "@/lib/librarySort";
import { cn } from "@/lib/cn";
import type { LibraryGame } from "@/types/library";

interface GameGridProps {
  games: LibraryGame[];
  isLoading?: boolean;
  enrichingIds?: string[];
  runningGameIds?: string[];
  onOpen?: (gameId: string) => void;
  onToggleFavorite?: (game: LibraryGame) => void;
}

export function GameGrid({
  games,
  isLoading = false,
  enrichingIds = [],
  runningGameIds = [],
  onOpen,
  onToggleFavorite,
}: GameGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
        {Array.from({ length: 8 }, (_, index) => (
          <GameCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          enriching={enrichingIds.includes(game.id)}
          running={runningGameIds.includes(game.id)}
          onOpen={onOpen}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}

interface GameCardProps {
  game: LibraryGame;
  enriching: boolean;
  running: boolean;
  onOpen?: (gameId: string) => void;
  onToggleFavorite?: (game: LibraryGame) => void;
}

function GameCard({ game, enriching, running, onOpen, onToggleFavorite }: GameCardProps) {
  const cover = toAssetUrl(game.coverPath);
  const banner = toAssetUrl(game.bannerPath);
  const logo = toAssetUrl(game.logoPath);
  const [coverReady, setCoverReady] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const showPlaceholder = !cover || coverFailed;

  return (
    <motion.article
      layout
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="glass-panel group relative cursor-pointer overflow-hidden rounded-3xl"
      onClick={() => onOpen?.(game.id)}
    >
      <div className="relative aspect-2/3 overflow-hidden">
        {banner && (
          <img
            src={banner}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-40"
          />
        )}

        {cover && !coverFailed && (
          <img
            src={cover}
            alt={game.name}
            onLoad={() => setCoverReady(true)}
            onError={() => setCoverFailed(true)}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105",
              coverReady ? "opacity-100" : "opacity-0",
            )}
          />
        )}

        {showPlaceholder && (
          <div
            className="absolute inset-0 grid place-items-center"
            style={{
              background: `linear-gradient(160deg, ${platformAccent(game.platform)}cc, #12080c 78%)`,
            }}
          >
            <Gamepad2 className="size-10 text-ivory/35" />
          </div>
        )}

        {(enriching || (cover && !coverReady && !coverFailed)) && (
          <div className="absolute inset-0 animate-pulse bg-white/6" />
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />

        <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-ivory/80">
          {running ? "Playing" : (game.collectionTag ?? game.platform)}
        </span>
        <button
          type="button"
          aria-label={game.isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite?.(game);
          }}
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/45 text-ivory/70 hover:text-crimson-glow"
        >
          <Heart className={cn("size-3.5", game.isFavorite && "fill-crimson-glow text-crimson-glow")} />
        </button>

        {logo && (
          <img
            src={logo}
            alt=""
            className="absolute bottom-14 left-1/2 max-h-12 max-w-[70%] -translate-x-1/2 object-contain opacity-90 drop-shadow-lg"
          />
        )}

        <div className="absolute inset-x-0 bottom-0 translate-y-3 p-3 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <p className="line-clamp-3 text-xs leading-5 text-ivory/80">
            {game.description ?? "Artwork and overview will appear after metadata finishes."}
          </p>
        </div>
      </div>

      <div className="space-y-2 px-3.5 py-3">
        <h3 className="line-clamp-2 text-[15px] font-medium leading-5">{gameTitle(game)}</h3>
        <div className="flex items-center justify-between text-xs text-ivory/45">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-3.5" />
            {formatPlaytime(game.playtimeMinutes)}
          </span>
          <span>{formatLastPlayed(game.lastPlayed)}</span>
        </div>
      </div>
    </motion.article>
  );
}

function GameCardSkeleton() {
  return (
    <div className="glass-panel overflow-hidden rounded-3xl">
      <div className="aspect-2/3 animate-pulse bg-white/6" />
      <div className="space-y-2 px-3.5 py-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/8" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/6" />
      </div>
    </div>
  );
}
