import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { MediaAsset } from "@/components/profile/MediaAsset";
import { GameAchievementsPanel } from "@/components/library/GameAchievementsPanel";
import { GameCommunityBoard } from "@/components/library/GameCommunityBoard";
import { GameMediaPanel } from "@/components/library/GameMediaPanel";
import { toAssetUrl } from "@/lib/assetUrl";
import { formatLastPlayed, formatPlaytime } from "@/lib/libraryDisplay";
import { dayBucketKey, dayBucketLabel, formatFeedDate } from "@/lib/relativeTime";
import { openExternal } from "@/lib/openExternal";
import { resolvedSteamAppId, steamStoreUrl } from "@/lib/steamArt";
import { cn } from "@/lib/cn";
import { useAchievementsStore } from "@/stores/achievementsStore";
import { useActivityStore } from "@/stores/activityStore";
import { useProfileStore } from "@/stores/profileStore";
import { useUpdatesStore } from "@/stores/updatesStore";
import { useT } from "@/i18n";
import type { GameTab } from "@/components/library/GameActionBar";
import {
  isToughAchievement,
  type AchievementView,
} from "@/types/achievements";
import type { LibraryGame } from "@/types/library";
import { initialsFromName } from "@/types/profile";

const EMPTY_ACHIEVEMENTS: AchievementView[] = [];
const POST_GAME_WINDOW_MS = 72 * 60 * 60 * 1000;

interface GameActivityProps {
  game: LibraryGame;
  tab: GameTab;
  achievementsOpen?: boolean;
  onAchievementsOpenChange?: (open: boolean) => void;
}

type TimelineItem =
  | { kind: "achievement"; id: string; at: number; achievement: AchievementView }
  | { kind: "session"; id: string; at: number; seconds: number }
  | { kind: "launch"; id: string; at: number; profileLabel: string | null }
  | { kind: "status"; id: string; at: number; text: string }
  | { kind: "news"; id: string; at: number; title: string; feedLabel: string };

export function GameActivity({
  game,
  tab,
  achievementsOpen: achievementsOpenProp,
  onAchievementsOpenChange,
}: GameActivityProps) {
  const t = useT();
  const [internalOpen, setInternalOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState("");
  const achievementsOpen = achievementsOpenProp ?? internalOpen;
  const setAchievementsOpen = onAchievementsOpenChange ?? setInternalOpen;

  const achievements = useAchievementsStore(
    (state) => state.byGame[game.id] ?? EMPTY_ACHIEVEMENTS,
  );
  const summary = useAchievementsStore((state) => state.summaries[game.id]);
  const load = useAchievementsStore((state) => state.load);
  const activityEntries = useActivityStore((state) => state.entries);
  const hydrateActivity = useActivityStore((state) => state.hydrate);
  const postStatus = useActivityStore((state) => state.postStatus);
  const newsItems = useUpdatesStore((state) => state.items);
  const username = useProfileStore((state) => state.username);
  const avatarPath = useProfileStore((state) => state.avatarPath);
  const avatarFocus = useProfileStore((state) => state.avatarFocus);
  const assetRevision = useProfileStore((state) => state.assetRevision);

  useEffect(() => {
    void load(game.id);
    hydrateActivity();
  }, [game.id, hydrateActivity, load]);

  useEffect(() => {
    if (achievementsOpenProp === undefined) {
      setInternalOpen(false);
    }
    setMediaOpen(false);
    setStatusDraft("");
  }, [game.id, achievementsOpenProp]);

  const unlocked = useMemo(
    () =>
      achievements
        .filter((item) => item.unlocked)
        .sort((a, b) => {
          const aAt = a.unlockedAt ? Date.parse(a.unlockedAt) : 0;
          const bAt = b.unlockedAt ? Date.parse(b.unlockedAt) : 0;
          return bAt - aAt;
        }),
    [achievements],
  );
  const locked = useMemo(
    () => achievements.filter((item) => !item.unlocked),
    [achievements],
  );

  const postGameUnlocks = useMemo(() => {
    const cutoff = Date.now() - POST_GAME_WINDOW_MS;
    const recent = unlocked.filter((item) => {
      if (!item.unlockedAt) {
        return false;
      }
      const at = Date.parse(item.unlockedAt);
      return Number.isFinite(at) && at >= cutoff;
    });
    const pool = recent.length > 0 ? recent : unlocked.slice(0, 12);
    // Left → right: oldest unlock first (fills the bar as they earn).
    return [...pool]
      .sort((a, b) => {
        const aAt = a.unlockedAt ? Date.parse(a.unlockedAt) : 0;
        const bAt = b.unlockedAt ? Date.parse(b.unlockedAt) : 0;
        return aAt - bAt;
      })
      .slice(0, 16);
  }, [unlocked]);

  const showPostGame = postGameUnlocks.length > 0;

  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];

    for (const achievement of unlocked) {
      if (!achievement.unlockedAt) {
        continue;
      }
      const at = Date.parse(achievement.unlockedAt);
      if (!Number.isFinite(at)) {
        continue;
      }
      items.push({
        kind: "achievement",
        id: `ach-${achievement.id}`,
        at,
        achievement,
      });
    }

    for (const entry of activityEntries) {
      if (entry.gameId !== game.id) {
        continue;
      }
      const at = Date.parse(entry.at);
      if (!Number.isFinite(at)) {
        continue;
      }
      if (entry.kind === "session") {
        items.push({
          kind: "session",
          id: entry.id,
          at,
          seconds: entry.sessionSeconds ?? 0,
        });
      } else if (entry.kind === "launch") {
        items.push({
          kind: "launch",
          id: entry.id,
          at,
          profileLabel: entry.profileLabel,
        });
      } else if (entry.kind === "status" && entry.text) {
        items.push({
          kind: "status",
          id: entry.id,
          at,
          text: entry.text,
        });
      }
    }

    for (const item of newsItems) {
      if (item.gameId !== game.id) {
        continue;
      }
      const at = Date.parse(item.publishedAt) || item.publishedUnix * 1000;
      if (!Number.isFinite(at)) {
        continue;
      }
      items.push({
        kind: "news",
        id: `news-${item.id}`,
        at,
        title: item.title,
        feedLabel: item.feedLabel,
      });
    }

    items.sort((a, b) => b.at - a.at);
    return items.slice(0, 40);
  }, [activityEntries, game.id, newsItems, unlocked]);

  const timelineGroups = useMemo(() => {
    const groups: { key: string; label: string; items: TimelineItem[] }[] = [];
    for (const item of timeline) {
      const key = dayBucketKey(item.at);
      const existing = groups.find((group) => group.key === key);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({
          key,
          label: dayBucketLabel(item.at).toUpperCase(),
          items: [item],
        });
      }
    }
    return groups;
  }, [timeline]);

  const total = summary?.total ?? achievements.length;
  const unlockedCount = summary?.unlocked ?? unlocked.length;
  const pct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;
  const recentAchievement = unlocked[0] ?? null;
  const lockedPreview = locked.slice(0, 5);
  const lockedExtra = Math.max(0, locked.length - lockedPreview.length);
  const title = game.displayName?.trim() || game.name;
  const steamAppId = resolvedSteamAppId(game);

  function submitStatus(event: FormEvent): void {
    event.preventDefault();
    postStatus(game.id, title, statusDraft);
    setStatusDraft("");
  }

  if (achievementsOpen) {
    return (
      <div className="bg-transparent px-8 py-5">
        <GameAchievementsPanel
          game={game}
          onClose={() => setAchievementsOpen(false)}
        />
      </div>
    );
  }

  if (mediaOpen) {
    return (
      <div className="bg-transparent px-8 py-5">
        <GameMediaPanel game={game} onClose={() => setMediaOpen(false)} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 bg-transparent px-8 py-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-6">
        {tab === "DLC" ? (
          <EmptyNote>No DLC is registered for this install.</EmptyNote>
        ) : null}
        {tab === "Support" ? (
          <EmptyNote>
            Support links open from the Steam store when an App ID is known. In-client tickets come
            later.
          </EmptyNote>
        ) : null}

        {tab === "Discussions" ? (
          <GameCommunityBoard game={game} kind="discussions" />
        ) : null}
        {tab === "Guides" ? <GameCommunityBoard game={game} kind="guides" /> : null}

        {tab !== "Discussions" && tab !== "Guides" ? (
          <>
            {showPostGame ? (
              <section>
                <SectionHeading>{t("game.postGameSummary")}</SectionHeading>
                <div className="postgame-panel glass-card overflow-hidden rounded-xl">
                  <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
                    <p className="text-[12px] text-muted">
                      {postGameUnlocks[0]?.unlockedAt
                        ? dayBucketLabel(Date.parse(postGameUnlocks[0].unlockedAt!))
                        : "Recent"}
                    </p>
                  </div>
                  <div className="postgame-bar">
                    {postGameUnlocks.map((item) => (
                      <PostGameCard
                        key={item.id}
                        item={item}
                        playersHaveLabel={t("game.playersHave", {
                          pct:
                            item.globalPercent != null
                              ? item.globalPercent.toFixed(1)
                              : "—",
                        })}
                      />
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            <section>
              <SectionHeading>{t("game.activity")}</SectionHeading>
          <form onSubmit={submitStatus} className="mb-3">
            <input
              type="text"
              value={statusDraft}
              onChange={(event) => setStatusDraft(event.target.value)}
              placeholder={t("game.statusPlaceholder")}
              maxLength={280}
              className="h-10 w-full rounded-xl border border-line bg-inset px-3 text-[13px] text-ivory outline-none placeholder:text-muted/70 focus:border-accent/50"
            />
          </form>

          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[12px] text-muted">
              {game.lastPlayed
                ? t("game.lastPlayedLine", {
                    when: formatLastPlayed(game.lastPlayed),
                    playtime: formatPlaytime(game.playtimeMinutes),
                  })
                : t("game.noSessions")}
            </p>
            {steamAppId ? (
              <button
                type="button"
                onClick={() => void openExternal(`${steamStoreUrl(steamAppId)}#app_news`)}
                className="shrink-0 text-[12px] text-muted underline-offset-2 hover:text-ivory hover:underline"
              >
                {t("game.viewLatestNews")}
              </button>
            ) : null}
          </div>

          {timelineGroups.length === 0 ? (
            <div className="glass-card rounded-xl px-4 py-8 text-center">
              <p className="text-[13px] text-muted">{t("game.activityEmpty")}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {timelineGroups.map((group) => (
                <div key={group.key}>
                  <div className="mb-3 flex items-center gap-3">
                    <p className="text-[12px] font-semibold tracking-[0.14em] text-ivory">
                      {group.label}
                    </p>
                    <div className="h-px flex-1 bg-line" />
                  </div>
                  <div className="space-y-4">
                    {group.items.map((item) => (
                      <TimelineRow
                        key={item.id}
                        item={item}
                        username={username}
                        avatarPath={avatarPath}
                        avatarFocus={avatarFocus}
                        assetRevision={assetRevision}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {game.description && (tab === "Store Page" || tab === "Community Hub") ? (
            <p className="mt-6 text-[13px] leading-6 text-ivory/85">{game.description}</p>
          ) : null}
            </section>
          </>
        ) : null}
      </div>

      <aside className="space-y-4 overflow-visible px-1 xl:sticky xl:top-0 xl:self-start">
        <SideSection title={t("game.friendsWhoPlay")}>
          <p className="mb-2 text-[12px] text-muted">{t("game.friendsOffline")}</p>
          <p className="mb-2 text-[12px] text-muted">{t("game.friendsPlayed")}</p>
          <div className="mb-3 flex gap-2">
            {[0, 1].map((slot) => (
              <div
                key={slot}
                className="size-9 rounded-full border border-dashed border-line bg-black/25"
              />
            ))}
          </div>
          <p className="mb-2 text-[12px] text-muted">{t("game.friendsWishlist")}</p>
          <button
            type="button"
            disabled
            className="ml-auto block text-[11px] text-muted/60"
          >
            {t("game.viewAllFriends")}
          </button>
        </SideSection>

        {total > 0 && unlockedCount >= total ? (
          <div className="ach-hunted-rim">
            <p className="ach-hunted-stamp" aria-label={t("game.allHunted")}>
              {t("game.allHunted")}
            </p>
            <SideSection title={t("game.achievementsTitle")}>
              <p className="text-[12px] text-gold/90">
                {t("game.perfectClear", { unlocked: unlockedCount, total })}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/45">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-gold/80 to-accent" />
              </div>

              {recentAchievement ? (
                <div className="mt-3">
                  <AchievementMini item={recentAchievement} />
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setMediaOpen(false);
                  setAchievementsOpen(true);
                }}
                className="mt-3 ml-auto block text-[12px] text-muted underline-offset-2 hover:text-ivory hover:underline"
              >
                {t("game.viewMyAchievements")}
              </button>
            </SideSection>
          </div>
        ) : (
          <SideSection title={t("game.achievementsTitle")}>
            <p className="text-[12px] text-muted">
              {total > 0
                ? t("game.unlockedProgress", {
                    unlocked: unlockedCount,
                    total,
                    pct,
                  })
                : t("game.noAchievements")}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/45">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>

            {recentAchievement ? (
              <div className="mt-3">
                <AchievementMini item={recentAchievement} />
              </div>
            ) : null}

            {lockedPreview.length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                  {t("game.lockedAchievements")}
                </p>
                <div className="flex items-center gap-1.5">
                  {lockedPreview.map((item) => (
                    <LockedIcon key={item.id} item={item} />
                  ))}
                  {lockedExtra > 0 ? (
                    <span className="ml-1 text-[12px] text-muted">+{lockedExtra}</span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setMediaOpen(false);
                setAchievementsOpen(true);
              }}
              className="mt-3 ml-auto block text-[12px] text-muted underline-offset-2 hover:text-ivory hover:underline"
            >
              {t("game.viewMyAchievements")}
            </button>
          </SideSection>
        )}

        <SideSection title={t("game.media")}>
          <p className="text-[12px] text-muted">{t("game.mediaHint")}</p>
          <button
            type="button"
            onClick={() => {
              setAchievementsOpen(false);
              setMediaOpen(true);
            }}
            className="mt-2 text-[12px] text-muted underline-offset-2 hover:text-ivory hover:underline"
          >
            {t("game.openMedia")}
          </button>
        </SideSection>
      </aside>
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2.5 text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
      {children}
    </h3>
  );
}

function SideSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass-card rounded-xl px-3.5 py-3.5">
      <h4 className="mb-2.5 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
        {title}
      </h4>
      {children}
    </section>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-[13px] text-muted">{children}</p>;
}

function ProfileChip({
  username,
  avatarPath,
  avatarFocus,
  assetRevision,
}: {
  username: string;
  avatarPath: string | null;
  avatarFocus: { x: number; y: number };
  assetRevision: number;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative size-7 overflow-hidden rounded-full border border-line bg-black/35">
        <MediaAsset
          src={avatarPath}
          focus={avatarFocus}
          cacheKey={assetRevision}
          className="size-full object-cover"
          fallback={
            <span className="grid size-full place-items-center text-[10px] font-semibold text-muted">
              {initialsFromName(username)}
            </span>
          }
        />
      </span>
      <span className="text-[13px] font-medium text-ivory">{username}</span>
    </span>
  );
}

function TimelineRow({
  item,
  username,
  avatarPath,
  avatarFocus,
  assetRevision,
}: {
  item: TimelineItem;
  username: string;
  avatarPath: string | null;
  avatarFocus: { x: number; y: number };
  assetRevision: number;
}) {
  const chip = (
    <ProfileChip
      username={username}
      avatarPath={avatarPath}
      avatarFocus={avatarFocus}
      assetRevision={assetRevision}
    />
  );

  if (item.kind === "achievement") {
    return (
      <article>
        <p className="mb-2 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
          {chip}
          <span>unlocked an achievement</span>
        </p>
        <AchievementHighlight item={item.achievement} />
      </article>
    );
  }

  if (item.kind === "session") {
    const minutes = Math.max(1, Math.round(item.seconds / 60));
    return (
      <article className="glass-card rounded-xl px-3.5 py-3">
        <p className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
          {chip}
          <span>
            finished a session · {formatPlaytime(minutes)}
          </span>
        </p>
      </article>
    );
  }

  if (item.kind === "launch") {
    return (
      <article className="glass-card rounded-xl px-3.5 py-3">
        <p className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
          {chip}
          <span>
            launched
            {item.profileLabel ? ` · ${item.profileLabel}` : ""}
          </span>
        </p>
      </article>
    );
  }

  if (item.kind === "status") {
    return (
      <article className="glass-card rounded-xl px-3.5 py-3">
        <p className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
          {chip}
          <span>said</span>
        </p>
        <p className="text-[14px] leading-6 text-ivory">{item.text}</p>
      </article>
    );
  }

  return (
    <article className="glass-card rounded-xl px-3.5 py-3">
      <p className="text-[11px] tracking-wide text-muted uppercase">{item.feedLabel}</p>
      <p className="mt-1 text-[13px] text-ivory">{item.title}</p>
      <p className="mt-1 text-[11px] text-muted">
        {formatFeedDate(new Date(item.at).toISOString(), Math.floor(item.at / 1000))}
      </p>
    </article>
  );
}

function PostGameCard({
  item,
  playersHaveLabel,
}: {
  item: AchievementView;
  playersHaveLabel: string;
}) {
  const icon = item.iconPath || item.iconLockedPath;
  const src = icon ? toAssetUrl(icon) : null;
  const tough = isToughAchievement(item);
  const title =
    item.hidden && !item.unlocked ? "Hidden achievement" : item.displayName;
  const detail =
    item.hidden && !item.unlocked
      ? "Unlock to reveal details."
      : item.description || "";

  return (
    <article className="postgame-card">
      <div className={cn("postgame-card-icon ach-cinder-wrap", tough && "is-rare")}>
        {tough ? <span className="ach-cinder-aura postgame-rare-glow" aria-hidden /> : null}
        {src ? (
          <img src={src} alt="" className="relative z-[1] size-14 rounded-md object-cover" draggable={false} />
        ) : (
          <div className="relative z-[1] size-14 rounded-md bg-black/50" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ivory">{title}</p>
        {detail ? (
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-muted">{detail}</p>
        ) : null}
        {item.globalPercent != null ? (
          <p className="mt-1.5 text-[11px] text-muted/90">{playersHaveLabel}</p>
        ) : null}
      </div>
    </article>
  );
}

function AchievementHighlight({ item }: { item: AchievementView }) {
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

  return (
    <div
      className={cn(
        "glass-card relative flex items-start gap-3 overflow-visible rounded-xl px-3 py-2.5",
        !item.unlocked && "opacity-80",
      )}
    >
      <div className="ach-cinder-wrap size-14 shrink-0">
        {tough ? <span className="ach-cinder-aura" aria-hidden /> : null}
        {src ? (
          <img
            src={src}
            alt=""
            className="relative z-[1] size-14 rounded-md object-cover"
            draggable={false}
          />
        ) : (
          <div className="relative z-[1] size-14 rounded-md bg-black/40" />
        )}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[14px] font-medium text-ivory">
          {title}
          {tough ? <span className="ml-2 text-[10px] tracking-wide text-gold">RARE</span> : null}
        </p>
        <p className="mt-0.5 text-[12px] leading-5 text-muted">{detail}</p>
        {item.globalPercent != null ? (
          <p className="mt-1.5 text-[11px] text-muted">
            {item.globalPercent.toFixed(1)}% of players have this achievement
          </p>
        ) : null}
      </div>
    </div>
  );
}

function AchievementMini({ item }: { item: AchievementView }) {
  const icon = item.iconPath || item.iconLockedPath;
  const src = icon ? toAssetUrl(icon) : null;
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-black/25 px-2 py-2">
      {src ? (
        <img src={src} alt="" className="size-10 rounded-md object-cover" draggable={false} />
      ) : (
        <div className="size-10 rounded-md bg-black/40" />
      )}
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-ivory">{item.displayName}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted">
          {item.description || "Unlocked"}
        </p>
      </div>
    </div>
  );
}

function LockedIcon({ item }: { item: AchievementView }) {
  const icon = item.iconLockedPath || item.iconPath;
  const src = icon ? toAssetUrl(icon) : null;
  return (
    <div
      className="relative size-10 overflow-hidden rounded-md border border-line bg-black/40"
      title={item.hidden ? "Hidden achievement" : item.displayName}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="size-full object-cover opacity-35 grayscale"
          draggable={false}
        />
      ) : null}
      <span className="absolute inset-0 grid place-items-center bg-black/35">
        <Lock className="size-3 text-muted" />
      </span>
    </div>
  );
}
