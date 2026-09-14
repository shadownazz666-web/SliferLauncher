import { SteamArt } from "@/components/library/SteamArt";
import { platformAccent } from "@/lib/libraryDisplay";
import { gameTitle } from "@/lib/librarySort";
import { gameArtUrls } from "@/lib/steamArt";
import type { LibraryGame } from "@/types/library";

interface GameHeroProps {
  game: LibraryGame;
}

export function GameHero({ game }: GameHeroProps) {
  const hasBanner = gameArtUrls(game, "banner").length > 0;
  const hasLogo = gameArtUrls(game, "logo").length > 0;

  return (
    <section className="relative h-[280px] shrink-0 overflow-hidden">
      {hasBanner ? (
        <SteamArt game={game} kind="banner" className="h-full w-full" />
      ) : (
        <div
          className="h-full w-full"
          style={{
            background: `linear-gradient(120deg, ${platformAccent(game.platform)}, rgba(7,6,10,0.92))`,
          }}
        />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 px-8 pb-6">
        {hasLogo ? (
          <SteamArt
            game={game}
            kind="logo"
            alt=""
            className="mb-3 max-h-20 max-w-[min(520px,70%)] object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.65)]"
          />
        ) : null}
        <h2 className="text-4xl font-semibold tracking-wide text-white drop-shadow-lg">
          {gameTitle(game)}
        </h2>
      </div>
    </section>
  );
}
