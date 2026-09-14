import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Play, Plus, Trash2 } from "lucide-react";
import { formatLastPlayed, formatPlaytime } from "@/lib/libraryDisplay";
import { openExternal } from "@/lib/openExternal";
import { resolvedSteamAppId, steamStoreUrl } from "@/lib/steamArt";
import { cn } from "@/lib/cn";
import { useT } from "@/i18n";
import { useAchievementsStore } from "@/stores/achievementsStore";
import { useLibraryStore } from "@/stores/libraryStore";
import type { LaunchProfile, LibraryGame } from "@/types/library";

export const GAME_TABS = [
  "Store Page",
  "DLC",
  "Community Hub",
  "Discussions",
  "Guides",
  "Support",
] as const;

export type GameTab = (typeof GAME_TABS)[number];

interface GameActionBarProps {
  game: LibraryGame;
  tab: GameTab;
  onTab: (tab: GameTab) => void;
  onOpenAchievements?: () => void;
}

export function GameActionBar({ game, tab, onTab, onOpenAchievements }: GameActionBarProps) {
  const t = useT();
  const running = useLibraryStore((state) => state.runningGameIds.includes(game.id));
  const launching = useLibraryStore((state) => state.launchingId === game.id);
  const launch = useLibraryStore((state) => state.launch);
  const savePreferences = useLibraryStore((state) => state.savePreferences);
  const [menuOpen, setMenuOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const playGroupRef = useRef<HTMLDivElement>(null);

  const profiles = game.launchProfiles ?? [];
  const activeProfile =
    profiles.find((profile) => profile.id === game.defaultProfileId) ?? profiles[0] ?? null;
  const achievementSummary = useAchievementsStore((state) => state.summaries[game.id]);
  const loadSummary = useAchievementsStore((state) => state.loadSummary);

  useEffect(() => {
    void loadSummary(game.id);
  }, [game.id, loadSummary]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    function placeMenu() {
      const anchor = playGroupRef.current ?? menuButtonRef.current;
      if (!anchor) {
        return;
      }
      const rect = anchor.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 6, left: rect.left });
    }
    placeMenu();
    function onPointer(event: globalThis.MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || menuButtonRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    }
    document.addEventListener("click", onPointer);
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      document.removeEventListener("click", onPointer);
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [menuOpen]);

  function toggleMenu(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    event.stopPropagation();
    if (running || launching) {
      return;
    }
    const anchor = playGroupRef.current ?? event.currentTarget;
    const rect = anchor.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 6, left: rect.left });
    setMenuOpen((current) => !current);
  }

  async function playWith(profileId: string | null): Promise<void> {
    setMenuOpen(false);
    if (profileId) {
      await savePreferences({ gameId: game.id, defaultProfileId: profileId });
    }
    await launch(game.id, profileId);
  }

  async function addProfile(): Promise<void> {
    const id = `profile-${Date.now()}`;
    const next: LaunchProfile[] = [
      ...profiles,
      {
        id,
        label: `Profile ${profiles.length + 1}`,
        exePath: null,
        args: null,
        workingDir: null,
      },
    ];
    await savePreferences({
      gameId: game.id,
      launchProfiles: next,
      defaultProfileId: game.defaultProfileId ?? id,
    });
    setManageOpen(true);
  }

  async function updateProfile(next: LaunchProfile): Promise<void> {
    await savePreferences({
      gameId: game.id,
      launchProfiles: profiles.map((profile) => (profile.id === next.id ? next : profile)),
    });
  }

  async function removeProfile(profileId: string): Promise<void> {
    const next = profiles.filter((profile) => profile.id !== profileId);
    await savePreferences({
      gameId: game.id,
      launchProfiles: next,
      defaultProfileId:
        game.defaultProfileId === profileId ? (next[0]?.id ?? "") : game.defaultProfileId,
    });
  }

  return (
    <div className="slifer-surface border-b border-line">
      <div className="flex flex-wrap items-center gap-6 px-8 py-4">
        <div className="slifer-play-group relative flex" ref={playGroupRef}>
          <button
            type="button"
            onClick={() => void playWith(activeProfile?.id ?? null)}
            disabled={running || launching}
            className="slifer-play slifer-play-main inline-flex min-w-36 items-center justify-center gap-2 px-6 py-2.5 text-[15px] font-semibold tracking-[0.12em] text-white disabled:opacity-55"
          >
            <Play className="size-4 fill-current" />
            {running ? "PLAYING" : launching ? "LAUNCHING" : "PLAY"}
          </button>
          <span className="slifer-play-divider" aria-hidden />
          <button
            type="button"
            ref={menuButtonRef}
            disabled={running || launching}
            onClick={toggleMenu}
            className="slifer-play slifer-play-menu inline-flex items-center justify-center px-2.5 py-2.5 text-white disabled:opacity-55"
            aria-label="Launch profiles"
            aria-expanded={menuOpen}
          >
            <ChevronDown className="size-4" />
          </button>

          {menuOpen && typeof document !== "undefined"
            ? createPortal(
                <div
                  ref={menuRef}
                  className="glass-menu min-w-56 rounded-xl py-1.5 text-[13px] text-ivory shadow-2xl"
                  style={{
                    position: "fixed",
                    top: menuPos.top,
                    left: menuPos.left,
                    zIndex: 9999,
                  }}
                >
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left hover:bg-hover"
                    onClick={() => void playWith(null)}
                  >
                    Default executable
                  </button>
                  {profiles.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      className={cn(
                        "block w-full px-3 py-1.5 text-left hover:bg-hover",
                        activeProfile?.id === profile.id && "text-accent",
                      )}
                      onClick={() => void playWith(profile.id)}
                    >
                      {profile.label}
                    </button>
                  ))}
                  <div className="my-1 h-px bg-line" />
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-muted hover:bg-hover hover:text-ivory"
                    onClick={() => {
                      setMenuOpen(false);
                      setManageOpen(true);
                    }}
                  >
                    Manage profiles…
                  </button>
                </div>,
                document.body,
              )
            : null}
        </div>

        <Meta label={t("game.lastPlayed")} value={formatLastPlayed(game.lastPlayed)} />
        <Meta label={t("game.playTime")} value={formatPlaytime(game.playtimeMinutes)} />
        <button
          type="button"
          className="text-left"
          onClick={() => onOpenAchievements?.()}
        >
          <Meta
            label={t("game.achievements")}
            value={
              achievementSummary && achievementSummary.total > 0
                ? `${achievementSummary.unlocked}/${achievementSummary.total}`
                : "—"
            }
          />
        </button>
        {activeProfile ? (
          <Meta label={t("game.profile")} value={activeProfile.label} />
        ) : null}
      </div>

      {manageOpen ? (
        <div className="space-y-3 border-t border-line px-8 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-medium text-ivory">Launch profiles</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void addProfile()}
                className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[12px] text-ivory hover:bg-hover"
              >
                <Plus className="size-3.5" />
                Add
              </button>
              <button
                type="button"
                onClick={() => setManageOpen(false)}
                className="rounded-lg px-2 py-1 text-[12px] text-muted hover:text-ivory"
              >
                Done
              </button>
            </div>
          </div>
          {profiles.length === 0 ? (
            <p className="text-[12px] text-muted">
              No custom profiles yet. Add one for Modded, VR, or a different exe.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {profiles.map((profile) => (
                <ProfileEditor
                  key={profile.id}
                  profile={profile}
                  isDefault={game.defaultProfileId === profile.id}
                  onChange={(next) => void updateProfile(next)}
                  onDefault={() =>
                    void savePreferences({ gameId: game.id, defaultProfileId: profile.id })
                  }
                  onRemove={() => void removeProfile(profile.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      <nav className="flex flex-wrap gap-1 px-8" aria-label="Game">
        {GAME_TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              onTab(item);
              const appId = resolvedSteamAppId(game);
              if ((item === "Store Page" || item === "Community Hub") && appId) {
                void openExternal(
                  item === "Community Hub"
                    ? `https://steamcommunity.com/app/${appId}`
                    : steamStoreUrl(appId),
                );
              }
            }}
            className={cn(
              "border-b-2 px-3 py-2 text-[13px]",
              tab === item
                ? "border-accent text-ivory"
                : "border-transparent text-muted hover:text-ivory",
            )}
          >
            {item}
          </button>
        ))}
      </nav>
    </div>
  );
}

function ProfileEditor({
  profile,
  isDefault,
  onChange,
  onDefault,
  onRemove,
}: {
  profile: LaunchProfile;
  isDefault: boolean;
  onChange: (profile: LaunchProfile) => void;
  onDefault: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-inset/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          value={profile.label}
          onChange={(event) => onChange({ ...profile, label: event.target.value })}
          className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-chip px-2 text-[13px] text-ivory outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={onRemove}
          className="grid size-8 place-items-center rounded-lg text-muted hover:bg-hover hover:text-white"
          title="Remove profile"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <label className="mb-2 block">
        <span className="text-[10px] tracking-[0.12em] text-muted">EXE PATH (optional)</span>
        <input
          value={profile.exePath ?? ""}
          onChange={(event) =>
            onChange({ ...profile, exePath: event.target.value.trim() || null })
          }
          placeholder="Leave blank to use game default"
          className="mt-1 h-8 w-full rounded-lg border border-line bg-chip px-2 text-[12px] text-ivory outline-none focus:border-accent"
        />
      </label>
      <label className="mb-2 block">
        <span className="text-[10px] tracking-[0.12em] text-muted">ARGS</span>
        <input
          value={profile.args ?? ""}
          onChange={(event) => onChange({ ...profile, args: event.target.value || null })}
          placeholder="-windowed -mod …"
          className="mt-1 h-8 w-full rounded-lg border border-line bg-chip px-2 text-[12px] text-ivory outline-none focus:border-accent"
        />
      </label>
      <button
        type="button"
        onClick={onDefault}
        className={cn(
          "text-[11px]",
          isDefault ? "text-accent" : "text-muted hover:text-ivory",
        )}
      >
        {isDefault ? "Default profile" : "Make default"}
      </button>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-0.5 text-[13px] text-ivory">{value}</p>
    </div>
  );
}
