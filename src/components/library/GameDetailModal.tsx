import { AnimatePresence, motion } from "framer-motion";
import { Clock3, Folder, Heart, Play, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toAssetUrl } from "@/lib/assetUrl";
import { formatLastPlayed, formatPlaytime, platformAccent } from "@/lib/libraryDisplay";
import { gameTitle } from "@/lib/librarySort";
import { cn } from "@/lib/cn";
import { useLibraryStore } from "@/stores/libraryStore";

export function GameDetailModal() {
  const games = useLibraryStore((state) => state.games);
  const selectedGameId = useLibraryStore((state) => state.selectedGameId);
  const selectGame = useLibraryStore((state) => state.selectGame);
  const game = games.find((item) => item.id === selectedGameId) ?? null;

  return (
    <AnimatePresence>
      {game && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close details"
            className="absolute inset-0 bg-black/55"
            onClick={() => selectGame(null)}
          />
          <GameDetailCard />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GameDetailCard() {
  const games = useLibraryStore((state) => state.games);
  const selectedGameId = useLibraryStore((state) => state.selectedGameId);
  const runningGameIds = useLibraryStore((state) => state.runningGameIds);
  const launchingId = useLibraryStore((state) => state.launchingId);
  const selectGame = useLibraryStore((state) => state.selectGame);
  const launch = useLibraryStore((state) => state.launch);
  const savePreferences = useLibraryStore((state) => state.savePreferences);
  const game = games.find((item) => item.id === selectedGameId);

  const [launchArgs, setLaunchArgs] = useState(game?.launchArgs ?? "");
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    setLaunchArgs(game?.launchArgs ?? "");
    setTagDraft("");
  }, [game?.id, game?.launchArgs]);

  if (!game) {
    return null;
  }

  const selected = game;
  const banner = toAssetUrl(selected.bannerPath);
  const logo = toAssetUrl(selected.logoPath);
  const cover = toAssetUrl(selected.coverPath);
  const running = runningGameIds.includes(selected.id);
  const launching = launchingId === selected.id;

  async function addTag() {
    const next = tagDraft.trim();
    if (!next || selected.customTags.some((tag) => tag.toLowerCase() === next.toLowerCase())) {
      setTagDraft("");
      return;
    }
    await savePreferences({
      gameId: selected.id,
      customTags: [...selected.customTags, next],
    });
    setTagDraft("");
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      className="glass-panel relative z-10 flex max-h-[min(820px,92%)] w-full max-w-4xl flex-col overflow-hidden rounded-[28px]"
    >
      <div className="relative h-52 shrink-0 overflow-hidden">
        {banner ? (
          <img src={banner} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(120deg, ${platformAccent(game.platform)}aa, #12080c)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-[#0a090d] via-black/20 to-transparent" />
        <button
          type="button"
          aria-label="Close"
          onClick={() => selectGame(null)}
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-black/40 text-ivory/80 hover:bg-black/60"
        >
          <X className="size-4" />
        </button>
        {logo && (
          <img
            src={logo}
            alt={game.name}
            className="absolute bottom-5 left-6 max-h-16 max-w-[46%] object-contain drop-shadow-lg"
          />
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="flex flex-col gap-5 md:flex-row">
          {cover && (
            <img
              src={cover}
              alt=""
              className="hidden h-52 w-36 shrink-0 rounded-2xl object-cover md:block"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.18em] text-gold/80">
              {game.collectionTag ?? game.platform}
            </p>
            <h2 className="mt-1 text-3xl font-semibold">{gameTitle(game)}</h2>
            <p className="mt-3 text-sm leading-6 text-ivory/65">
              {game.description ?? "No overview cached for this title yet."}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-ivory/55">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-4 text-gold" />
                {formatPlaytime(game.playtimeMinutes)} played
              </span>
              <span>{formatLastPlayed(game.lastPlayed)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void launch(game.id)}
            disabled={running || launching}
            className="inline-flex items-center gap-2 rounded-2xl bg-crimson px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            <Play className="size-4" />
            {running ? "Playing" : launching ? "Launching…" : "Play"}
          </button>
          <button
            type="button"
            onClick={() =>
              void savePreferences({ gameId: game.id, isFavorite: !game.isFavorite })
            }
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm",
              game.isFavorite ? "bg-crimson/20 text-crimson-glow" : "bg-white/8 text-ivory/70",
            )}
          >
            <Heart className={cn("size-4", game.isFavorite && "fill-current")} />
            Favorite
          </button>
          <button
            type="button"
            onClick={() => void savePreferences({ gameId: game.id, isHidden: !game.isHidden })}
            className="rounded-2xl bg-white/8 px-4 py-2.5 text-sm text-ivory/70"
          >
            {game.isHidden ? "Unhide" : "Hide"}
          </button>
        </div>

        <label className="mt-6 block">
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-ivory/40">
            <Folder className="size-3.5" />
            Install directory
          </span>
          <p className="mt-2 select-text rounded-2xl bg-black/25 px-3 py-2 text-sm text-ivory/70">
            {game.installDir}
          </p>
        </label>

        <label className="mt-4 block">
          <span className="text-xs uppercase tracking-[0.16em] text-ivory/40">
            Custom launch arguments
          </span>
          <input
            value={launchArgs}
            onChange={(event) => setLaunchArgs(event.target.value)}
            onBlur={() => {
              if ((game.launchArgs ?? "") !== launchArgs) {
                void savePreferences({ gameId: game.id, launchArgs });
              }
            }}
            placeholder="-windowed -borderless"
            className="mt-2 h-10 w-full rounded-2xl border border-white/8 bg-black/20 px-3 text-sm outline-none focus:border-crimson/50"
          />
        </label>

        <div className="mt-4">
          <p className="text-xs uppercase tracking-[0.16em] text-ivory/40">Categories</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {game.customTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  void savePreferences({
                    gameId: game.id,
                    customTags: game.customTags.filter((item) => item !== tag),
                  })
                }
                className="rounded-full bg-white/8 px-3 py-1 text-xs text-ivory/70 hover:bg-crimson/20"
                title="Remove tag"
              >
                {tag}
              </button>
            ))}
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void addTag();
              }}
            >
              <input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                placeholder="Add tag"
                className="h-8 w-36 rounded-full border border-white/8 bg-black/20 px-3 text-xs outline-none focus:border-crimson/50"
              />
              <button
                type="submit"
                className="grid size-8 place-items-center rounded-full bg-white/8 text-ivory/70"
                aria-label="Add category"
              >
                <Plus className="size-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
