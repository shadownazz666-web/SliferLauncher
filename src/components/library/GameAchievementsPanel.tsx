import { useEffect } from "react";
import { toAssetUrl } from "@/lib/assetUrl";
import { useAchievementsStore } from "@/stores/achievementsStore";
import type { LibraryGame } from "@/types/library";
import { isToughAchievement, type AchievementView } from "@/types/achievements";

const EMPTY_ACHIEVEMENTS: AchievementView[] = [];

interface GameAchievementsPanelProps {
  game: LibraryGame;
  compact?: boolean;
  onClose?: () => void;
}

export function GameAchievementsPanel({
  game,
  compact = false,
  onClose,
}: GameAchievementsPanelProps) {
  const achievements = useAchievementsStore(
    (state) => state.byGame[game.id] ?? EMPTY_ACHIEVEMENTS,
  );
  const summary = useAchievementsStore((state) => state.summaries[game.id]);
  const loading = useAchievementsStore((state) => state.loadingId === game.id);
  const syncing = useAchievementsStore((state) => state.syncingId === game.id);
  const error = useAchievementsStore((state) => state.error);
  const message = useAchievementsStore((state) => state.message);
  const load = useAchievementsStore((state) => state.load);
  const sync = useAchievementsStore((state) => state.sync);
  const toggle = useAchievementsStore((state) => state.toggle);

  useEffect(() => {
    void load(game.id);
  }, [game.id, load]);

  const total = summary?.total ?? achievements.length;
  const unlocked = summary?.unlocked ?? achievements.filter((item) => item.unlocked).length;
  const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  const sliferCount = achievements.filter((item) => item.source === "slifer").length;
  const hunted = total > 0 && unlocked >= total;

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className={hunted ? "ach-hunted-rim" : undefined}>
        {hunted ? (
          <p className="ach-hunted-stamp" aria-label="All achievements hunted">
            All achievements hunted
          </p>
        ) : null}
        <div
          className={
            hunted
              ? "space-y-4 rounded-[calc(1.05rem-2px)] bg-[rgb(var(--void-rgb)/0.9)] px-4 py-4 pt-5"
              : "space-y-4"
          }
        >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-white">Achievements</h3>
          <p className="mt-1 text-[12px] text-muted">
            {total === 0
              ? "No definitions yet. Sync to pull store schemas and Slifer trackers."
              : hunted
                ? `Perfect clear · ${unlocked} of ${total} unlocked`
                : `${unlocked} of ${total} unlocked (${pct}%) · ${sliferCount} Slifer`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={syncing}
            onClick={() => void sync(game.id)}
            className="rounded-sm bg-accent/90 px-3 py-1.5 text-[12px] font-semibold tracking-wide text-white disabled:opacity-45"
          >
            {syncing ? "Syncing…" : "Sync all platforms"}
          </button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-line px-3 py-1.5 text-[12px] text-muted hover:text-ivory"
            >
              Back
            </button>
          ) : null}
        </div>
      </div>

      {total > 0 ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
      ) : null}

      {error ? <p className="text-[12px] text-rose-300">{error}</p> : null}
      {message ? <p className="text-[12px] text-muted">{message}</p> : null}

      {loading && achievements.length === 0 ? (
        <p className="text-[13px] text-muted">Loading achievements…</p>
      ) : null}

      <div className="space-y-2 overflow-x-clip px-1 py-1">
        {achievements.map((item) => (
          <AchievementRow
            key={item.id}
            item={item}
            onToggle={(next) => void toggle(game.id, item.apiName, next)}
          />
        ))}
      </div>
        </div>
      </div>
    </div>
  );
}

function AchievementRow({
  item,
  onToggle,
}: {
  item: AchievementView;
  onToggle: (unlocked: boolean) => void;
}) {
  const icon = item.unlocked
    ? item.iconPath || item.iconLockedPath
    : item.iconLockedPath || item.iconPath;
  const src = icon ? toAssetUrl(icon) : null;
  const tough = isToughAchievement(item);
  const title =
    item.hidden && !item.unlocked ? "Hidden achievement" : item.displayName;
  const detail =
    item.hidden && !item.unlocked
      ? "Unlock to reveal details."
      : item.description || "No description.";
  const sourceLabel =
    item.source === "slifer"
      ? "Slifer"
      : item.source.charAt(0).toUpperCase() + item.source.slice(1);

  return (
    <article
      className={`glass-card relative z-0 flex items-center gap-3 overflow-visible rounded-xl px-3 py-2.5 ${
        item.unlocked ? "opacity-100" : "opacity-75"
      }`}
    >
      <div className={`ach-cinder-wrap size-12 shrink-0 ${tough ? "" : ""}`}>
        {tough ? <span className="ach-cinder-aura" aria-hidden /> : null}
        {src ? (
          <img
            src={src}
            alt=""
            className="relative z-[1] size-12 rounded-sm object-cover"
            draggable={false}
          />
        ) : (
          <div className="relative z-[1] size-12 rounded-sm bg-black/35" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-ivory">
          {title}
          {tough ? <span className="ml-2 text-[10px] tracking-wide text-gold">RARE</span> : null}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">{detail}</p>
        <p className="mt-1 text-[11px] text-muted">
          {sourceLabel}
          {item.globalPercent != null ? ` · ${item.globalPercent.toFixed(1)}% players` : ""}
          {item.unlocked && item.unlockedAt
            ? ` · Unlocked ${new Date(item.unlockedAt).toLocaleString()}`
            : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onToggle(!item.unlocked)}
        className="relative z-[1] shrink-0 rounded-sm border border-line px-2.5 py-1 text-[11px] font-semibold tracking-wide text-ivory hover:bg-hover"
      >
        {item.unlocked ? "Lock" : "Unlock"}
      </button>
    </article>
  );
}
