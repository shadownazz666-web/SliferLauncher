import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { AssetUploader } from "@/components/profile/AssetUploader";
import { MediaAsset } from "@/components/profile/MediaAsset";
import { ThemeSwitcher } from "@/components/profile/ThemeSwitcher";
import { SteamArt } from "@/components/library/SteamArt";
import { COUNTRIES, countryFlag, countryName } from "@/lib/countries";
import { formatLastPlayed, formatPlaytime } from "@/lib/libraryDisplay";
import { gameTitle, sortLibrary } from "@/lib/librarySort";
import {
  levelFromXp,
  levelRingColor,
  playtimeXp,
  xpIntoLevel as xpProgress,
} from "@/lib/profileXp";
import { availableBadges, normalizeFeaturedBadgeId } from "@/lib/badges";
import { cn } from "@/lib/cn";
import { useLibraryStore } from "@/stores/libraryStore";
import { useProfileStore } from "@/stores/profileStore";
import { useActivityStore } from "@/stores/activityStore";
import { useSetupStore } from "@/stores/setupStore";
import { useUiStore } from "@/stores/uiStore";
import { useT } from "@/i18n";
import { isSliferOwner, OWNER_BADGE } from "@/lib/owner";
import { ProfileComments } from "@/components/profile/ProfileComments";
import { APP_ROUTES } from "@/types/navigation";
import { SETUP_LOCALES } from "@/types/setup";
import {
  initialsFromName,
  PROFILE_STATUSES,
  DEFAULT_FOCUS,
  type ProfileAssetSlot,
} from "@/types/profile";
import type { LibraryGame } from "@/types/library";

type ProfileView = "activity" | "badges" | "edit";

const STATUS_STYLE = {
  Online: { ring: "#e11d2e", label: "Online", text: "text-accent" },
  Away: { ring: "#e8c36a", label: "Away", text: "text-gold" },
  Offline: { ring: "#898989", label: "Currently Offline", text: "text-muted" },
} as const;

export function ProfilePage() {
  const navigate = useNavigate();
  const flashToast = useUiStore((state) => state.flashToast);
  const games = useLibraryStore((state) => state.games);
  const selectGame = useLibraryStore((state) => state.selectGame);
  const username = useProfileStore((state) => state.username);
  const handle = useProfileStore((state) => state.handle);
  const bio = useProfileStore((state) => state.bio);
  const status = useProfileStore((state) => state.status);
  const avatarPath = useProfileStore((state) => state.avatarPath);
  const bannerPath = useProfileStore((state) => state.bannerPath);
  const backgroundPath = useProfileStore((state) => state.backgroundPath);
  const avatarFocus = useProfileStore((state) => state.avatarFocus);
  const bannerFocus = useProfileStore((state) => state.bannerFocus);
  const backgroundFocus = useProfileStore((state) => state.backgroundFocus);
  const assetRevision = useProfileStore((state) => state.assetRevision);
  const setUsername = useProfileStore((state) => state.setUsername);
  const setHandle = useProfileStore((state) => state.setHandle);
  const setBio = useProfileStore((state) => state.setBio);
  const setStatus = useProfileStore((state) => state.setStatus);
  const countryCode = useProfileStore((state) => state.countryCode);
  const setCountryCode = useProfileStore((state) => state.setCountryCode);
  const featuredBadgeId = useProfileStore((state) => state.featuredBadgeId);
  const setFeaturedBadgeId = useProfileStore((state) => state.setFeaturedBadgeId);
  const importAsset = useProfileStore((state) => state.importAsset);
  const removeAsset = useProfileStore((state) => state.removeAsset);
  const t = useT();
  const [view, setView] = useState<ProfileView>("activity");
  const [badgePickerOpen, setBadgePickerOpen] = useState(false);
  const [badgeMenuPos, setBadgeMenuPos] = useState({ top: 0, right: 0 });
  const badgePickerRef = useRef<HTMLDivElement>(null);
  const badgeButtonRef = useRef<HTMLButtonElement>(null);

  const visible = useMemo(() => games.filter((game) => !game.isHidden), [games]);
  const recent = useMemo(
    () => sortLibrary(visible, "lastPlayed").filter((game) => game.lastPlayed).slice(0, 6),
    [visible],
  );
  const showcase = useMemo(() => sortLibrary(visible, "playtime").slice(0, 8), [visible]);
  const favorites = useMemo(() => visible.filter((game) => game.isFavorite), [visible]);
  const activity = useActivityStore((state) => state.entries);
  const badges = useMemo(() => availableBadges(username), [username]);
  const activeBadgeId = normalizeFeaturedBadgeId(featuredBadgeId, username);
  const activeBadge = badges.find((badge) => badge.id === activeBadgeId) ?? badges[0]!;

  useEffect(() => {
    if (!badgePickerOpen) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (!badgePickerRef.current?.contains(event.target as Node)) {
        setBadgePickerOpen(false);
      }
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [badgePickerOpen]);

  const hoursLogged = Math.round(
    visible.reduce((total, game) => total + game.playtimeMinutes, 0) / 60,
  );
  const playtimeMinutes = visible.reduce((total, game) => total + game.playtimeMinutes, 0);
  const xp = playtimeXp(playtimeMinutes);
  const level = levelFromXp(xp);
  const xpIntoLevel = xpProgress(xp);
  const persona = STATUS_STYLE[status];
  const flag = countryFlag(countryCode);
  const nation = countryName(countryCode);

  return (
    <div className="relative h-full overflow-y-auto bg-transparent">
      <section className="relative z-20 overflow-visible">
        <div className="pointer-events-none absolute inset-0 overflow-hidden bg-inset">
          {bannerPath ? (
            <MediaAsset
              src={bannerPath}
              alt=""
              cacheKey={assetRevision}
              focus={bannerFocus}
            />
          ) : (
            <div className="h-full w-full bg-linear-to-r from-void via-chip to-void" />
          )}
          <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-void/85" />
        </div>

        <div className="relative mx-auto flex max-w-[960px] items-end gap-5 px-6 pt-16 pb-4">
          <div
            className="size-[164px] shrink-0 overflow-hidden bg-chip shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
            style={{ outline: `3px solid ${persona.ring}`, outlineOffset: "2px" }}
          >
            <MediaAsset
              src={avatarPath}
              alt={username}
              cacheKey={assetRevision}
              focus={avatarFocus}
              fallback={
                <span className="grid size-full place-items-center bg-linear-to-br from-chip to-void text-3xl font-semibold text-accent">
                  {initialsFromName(username)}
                </span>
              }
            />
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <h2 className="truncate text-[28px] font-semibold leading-none text-white drop-shadow-md">
              <span className="inline-flex items-center gap-2.5">
                {username}
                {isSliferOwner(username) ? (
                  <img
                    src="/badges/owner.png"
                    alt="Owner"
                    title="Owner"
                    className="size-8 rounded-full object-cover shadow-[0_0_12px_rgba(225,29,46,0.35)]"
                    draggable={false}
                  />
                ) : null}
              </span>
            </h2>
            <p className="mt-1.5 text-[13px] text-ivory/80 drop-shadow-sm">
              {handle ? `${handle}` : "Slifer Commander"}
              <span className="mx-1.5 text-ivory/50">•</span>
              <span className={persona.text}>{persona.label}</span>
              {nation ? (
                <>
                  <span className="mx-1.5 text-ivory/50">•</span>
                  <span className="inline-flex items-center gap-1.5 text-ivory/85">
                    <span className="text-[15px] leading-none" aria-hidden>
                      {flag}
                    </span>
                    {nation}
                  </span>
                </>
              ) : null}
            </p>
            {bio ? (
              <p className="mt-2 max-w-xl text-[13px] leading-5 text-ivory/90 drop-shadow-sm">
                {bio}
              </p>
            ) : (
              <p className="mt-2 text-[13px] text-ivory/55">No information given.</p>
            )}
          </div>

          <div className="relative mb-1 flex shrink-0 items-center gap-3" ref={badgePickerRef}>
            <div className="text-right">
              <p className="text-[11px] tracking-[0.14em] text-ivory/65">LEVEL</p>
              <p className="text-[22px] font-semibold leading-none text-white">{level}</p>
            </div>
            <button
              type="button"
              ref={badgeButtonRef}
              onClick={() => {
                const rect = badgeButtonRef.current?.getBoundingClientRect();
                if (rect) {
                  setBadgeMenuPos({
                    top: rect.bottom + 8,
                    right: Math.max(12, window.innerWidth - rect.right),
                  });
                }
                setBadgePickerOpen((open) => !open);
              }}
              className="grid size-16 place-items-center overflow-hidden rounded-full bg-void/55 transition hover:brightness-110"
              style={
                activeBadge.id === "level"
                  ? { boxShadow: `inset 0 0 0 4px ${levelRingColor(level)}` }
                  : undefined
              }
              title="Change featured badge"
              aria-label="Change featured badge"
              aria-expanded={badgePickerOpen}
            >
              {activeBadge.imageSrc ? (
                <img
                  src={activeBadge.imageSrc}
                  alt={activeBadge.name}
                  className="size-full object-cover"
                  draggable={false}
                />
              ) : (
                <span className="text-[22px] font-bold text-white">{level}</span>
              )}
            </button>
            {badgePickerOpen ? (
              <div
                className="glass-menu fixed z-[120] w-60 rounded-xl py-1.5 text-[13px] text-ivory shadow-2xl"
                style={{ top: badgeMenuPos.top, right: badgeMenuPos.right }}
              >
                <p className="px-3 py-1.5 text-[11px] tracking-[0.12em] text-muted">
                  FEATURED BADGE
                </p>
                {badges.map((badge) => (
                  <button
                    key={badge.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-hover",
                      activeBadgeId === badge.id && "text-accent",
                    )}
                    onClick={() => {
                      setFeaturedBadgeId(badge.id);
                      setBadgePickerOpen(false);
                    }}
                  >
                    <span
                      className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-inset"
                      style={
                        badge.id === "level"
                          ? { boxShadow: `inset 0 0 0 2px ${levelRingColor(level)}` }
                          : undefined
                      }
                    >
                      {badge.imageSrc ? (
                        <img
                          src={badge.imageSrc}
                          alt=""
                          className="size-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <span className="text-[12px] font-bold">{level}</span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{badge.name}</span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-muted">
                        {badge.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative mx-auto max-w-[960px] px-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-sm bg-black/45">
              <div className="h-full bg-accent" style={{ width: `${xpIntoLevel}%` }} />
            </div>
            <p className="shrink-0 text-[11px] text-ivory/70">{xpIntoLevel} / 100 XP</p>
          </div>
        </div>

        <nav className="relative border-t border-white/10" aria-label="Profile">
          <div className="mx-auto flex max-w-[960px] flex-wrap gap-1 px-6">
            <ProfileTab active={view === "activity"} onClick={() => setView("activity")}>
              {t("profile.activity")}
            </ProfileTab>
            <ProfileTab
              active={false}
              onClick={() => {
                flashToast("Inventory is unavailable in offline launcher mode.");
              }}
            >
              {t("profile.inventory")}
            </ProfileTab>
            <ProfileTab active={view === "badges"} onClick={() => setView("badges")}>
              {t("profile.badges")}
            </ProfileTab>
            <ProfileTab active={view === "edit"} onClick={() => setView("edit")}>
              {t("profile.edit")}
            </ProfileTab>
          </div>
        </nav>
      </section>

      <div className="relative isolate">
        {backgroundPath ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0">
              <MediaAsset
                src={backgroundPath}
                alt=""
                cacheKey={assetRevision}
                focus={backgroundFocus}
                className="object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-void/55" />
          </div>
        ) : null}

        <div className="relative z-10 mx-auto grid max-w-[960px] grid-cols-1 gap-4 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          {view === "edit" ? (
            <EditProfile
              username={username}
              handle={handle}
              bio={bio}
              status={status}
              countryCode={countryCode}
              avatarPath={avatarPath}
              bannerPath={bannerPath}
              backgroundPath={backgroundPath}
              onUsername={setUsername}
              onHandle={setHandle}
              onBio={setBio}
              onStatus={setStatus}
              onCountry={setCountryCode}
              onImport={async (slot, file) => {
                await importAsset(slot, file, DEFAULT_FOCUS);
              }}
              onClear={removeAsset}
            />
          ) : view === "badges" ? (
            <SteamBox title="Badges">
              {isSliferOwner(username) ? (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-black/25 px-3 py-3">
                  <img
                    src={OWNER_BADGE.imageSrc}
                    alt=""
                    className="size-16 rounded-full object-cover"
                    draggable={false}
                  />
                  <div>
                    <p className="text-[14px] font-semibold text-ivory">{OWNER_BADGE.name}</p>
                    <p className="mt-0.5 text-[12px] text-muted">{OWNER_BADGE.description}</p>
                    <button
                      type="button"
                      className="mt-2 text-[12px] text-accent hover:underline"
                      onClick={() => setFeaturedBadgeId("owner")}
                    >
                      Feature in corner
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mb-3 text-[12px] text-muted">
                  Badge slots are ready. Earnables will land here later.
                </p>
              )}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {Array.from({ length: isSliferOwner(username) ? 9 : 10 }, (_, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-xl border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md"
                    aria-hidden
                  />
                ))}
              </div>
            </SteamBox>
          ) : (
            <>
              <SteamBox title={t("profile.recentActivity")}>
                {activity.length === 0 && recent.length === 0 ? (
                  <p className="text-[13px] text-muted">
                    No sessions recorded on this machine yet. Launch a game from the Library to start
                    an activity feed.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activity.slice(0, 8).map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          selectGame(entry.gameId);
                          navigate(APP_ROUTES.library);
                        }}
                        className="flex w-full items-center gap-3 rounded-sm bg-inset p-2 text-left hover:bg-hover"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-ivory">
                            {entry.kind === "launch"
                              ? `Launched ${entry.gameName}`
                              : entry.kind === "status"
                                ? `Posted on ${entry.gameName}`
                                : `Played ${entry.gameName}`}
                          </span>
                          <span className="mt-0.5 block text-[12px] text-muted">
                            {entry.profileLabel ? `${entry.profileLabel} · ` : ""}
                            {entry.kind === "session" && entry.sessionSeconds != null
                              ? `${Math.max(1, Math.round(entry.sessionSeconds / 60))} min · `
                              : ""}
                            {new Date(entry.at).toLocaleString()}
                          </span>
                        </span>
                      </button>
                    ))}
                    {activity.length === 0
                      ? recent.map((game) => (
                          <ActivityGame
                            key={game.id}
                            game={game}
                            onOpen={() => {
                              selectGame(game.id);
                              navigate(APP_ROUTES.library);
                            }}
                          />
                        ))
                      : null}
                  </div>
                )}
              </SteamBox>

              <SteamBox title="Game Collector">
                {showcase.length === 0 ? (
                  <p className="text-[13px] text-muted">
                    Scan your library to showcase owned titles here.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {showcase.map((game) => (
                      <button
                        key={game.id}
                        type="button"
                        title={game.name}
                        onClick={() => {
                          selectGame(game.id);
                          navigate(APP_ROUTES.library);
                        }}
                        className="aspect-3/4 overflow-hidden bg-inset outline-1 outline-black/40 hover:outline-accent"
                      >
                        <SteamArt
                          game={game}
                          kind="cover"
                          alt={game.name}
                          className="size-full"
                          fallback={game.name}
                        />
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-[12px] text-muted">
                  {visible.length} games owned · {hoursLogged} hours on record
                </p>
              </SteamBox>

              <ProfileComments authorName={username} />
            </>
          )}
        </div>

        <aside className="space-y-3">
          <SteamBox>
            <p className="text-[13px] text-ivory">{visible.length} games collected</p>
            <p className="mt-0.5 text-[12px] text-muted">
              {favorites.length} favorites · {hoursLogged} hours logged
            </p>
          </SteamBox>
          <SteamBox title="Badges">
            <div className="flex flex-wrap gap-2">
              {badges
                .filter((badge) => badge.id !== "level")
                .map((badge) => (
                  <button
                    key={badge.id}
                    type="button"
                    title={badge.name}
                    onClick={() => setFeaturedBadgeId(badge.id)}
                    className="size-11 overflow-hidden rounded-full border border-white/10 bg-black/25 transition hover:border-accent/50"
                  >
                    {badge.imageSrc ? (
                      <img
                        src={badge.imageSrc}
                        alt={badge.name}
                        className="size-full object-cover"
                        draggable={false}
                      />
                    ) : null}
                  </button>
                ))}
              {Array.from(
                { length: Math.max(0, 4 - badges.filter((badge) => badge.id !== "level").length) },
                (_, index) => (
                  <div
                    key={`slot-${index}`}
                    className="size-11 rounded-full border border-dashed border-white/15 bg-white/5"
                    aria-hidden
                  />
                ),
              )}
            </div>
            <p className="mt-2 text-[11px] leading-4 text-muted">
              Earned badges show here. Click one to feature it in the corner.
            </p>
          </SteamBox>
          <SteamBox title="Inventory">
            <p className="text-[12px] leading-5 text-muted">
              Trading cards and items are not tracked while Slifer is in offline launcher mode.
            </p>
          </SteamBox>
          <SteamBox title="Groups">
            <p className="text-[12px] leading-5 text-muted">
              You have not joined any Slifer groups yet. Client groups will appear here when
              community features roll out.
            </p>
          </SteamBox>
        </aside>
      </div>
      </div>
    </div>
  );
}

function EditProfile({
  username,
  handle,
  bio,
  status,
  countryCode,
  avatarPath,
  bannerPath,
  backgroundPath,
  onUsername,
  onHandle,
  onBio,
  onStatus,
  onCountry,
  onImport,
  onClear,
}: {
  username: string;
  handle: string;
  bio: string;
  status: (typeof PROFILE_STATUSES)[number];
  countryCode: string | null;
  avatarPath: string | null;
  bannerPath: string | null;
  backgroundPath: string | null;
  onUsername: (value: string) => void;
  onHandle: (value: string) => void;
  onBio: (value: string) => void;
  onStatus: (value: (typeof PROFILE_STATUSES)[number]) => void;
  onCountry: (value: string | null) => void;
  onImport: (slot: ProfileAssetSlot, file: File) => Promise<void>;
  onClear: (slot: ProfileAssetSlot) => Promise<void>;
}) {
  const t = useT();
  const [artworkOpen, setArtworkOpen] = useState(false);
  const [changingLocale, setChangingLocale] = useState(false);
  const locale = useSetupStore((state) => state.locale);
  const changeLocaleAndRestart = useSetupStore((state) => state.changeLocaleAndRestart);

  return (
    <div className="space-y-4">
      <SteamBox title="Profile Info">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("profile.personaName")} value={username} maxLength={32} onChange={onUsername} />
          <Field label="Real name" value={handle} maxLength={24} onChange={onHandle} />
        </div>
        <label className="mt-3 block">
          <span className="text-[11px] tracking-[0.12em] text-muted">SUMMARY</span>
          <textarea
            value={bio}
            maxLength={280}
            rows={3}
            onChange={(event) => onBio(event.target.value)}
            placeholder="Tell people a bit about yourself."
            className="mt-1.5 w-full resize-none rounded-sm border border-line bg-inset px-3 py-2 text-[13px] text-ivory outline-none placeholder:text-muted focus:border-accent"
          />
        </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] tracking-[0.12em] text-muted">STATUS</span>
            <select
              value={status}
              onChange={(event) => onStatus(event.target.value as (typeof PROFILE_STATUSES)[number])}
              className="mt-1.5 h-9 w-full rounded-sm border border-line bg-inset px-2 text-[13px] text-ivory outline-none focus:border-accent"
            >
              {PROFILE_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] tracking-[0.12em] text-muted">COUNTRY</span>
            <select
              value={countryCode ?? ""}
              onChange={(event) => onCountry(event.target.value || null)}
              className="mt-1.5 h-9 w-full rounded-sm border border-line bg-inset px-2 text-[13px] text-ivory outline-none focus:border-accent"
            >
              <option value="">Not set</option>
              {COUNTRIES.map((item) => (
                <option key={item.code} value={item.code}>
                  {countryFlag(item.code)} {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 block">
          <span className="text-[11px] tracking-[0.12em] text-muted">{t("profile.language")}</span>
          <select
            value={locale || "en"}
            disabled={changingLocale}
            onChange={(event) => {
              const next = event.target.value;
              if (next === (locale || "en")) {
                return;
              }
              setChangingLocale(true);
              void changeLocaleAndRestart(next).finally(() => setChangingLocale(false));
            }}
            className="mt-1.5 h-9 w-full rounded-sm border border-line bg-inset px-2 text-[13px] text-ivory outline-none focus:border-accent disabled:opacity-55"
          >
            {SETUP_LOCALES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.native} ({item.label})
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-muted">
            {t("profile.languageRestart")}
          </span>
        </label>
      </SteamBox>

      <section className="glass-card rounded-2xl px-3.5 py-3">
        <button
          type="button"
          onClick={() => setArtworkOpen((current) => !current)}
          className="flex w-full items-center gap-2 text-left"
          aria-expanded={artworkOpen}
        >
          <ChevronDown
            className={cn(
              "mt-0.5 size-4 shrink-0 text-muted transition-transform",
              !artworkOpen && "-rotate-90",
            )}
          />
          <span>
            <span className="block text-[13px] font-semibold text-accent">Profile Artwork</span>
            <span className="mt-0.5 block text-[12px] text-muted">
              GIF, WebM, and MP4 are stored under AppData. Save to lock a new image in.
            </span>
          </span>
        </button>
        {artworkOpen ? (
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <AssetUploader
              slot="avatar"
              label="Avatar"
              hint="Square artwork"
              currentPath={avatarPath}
              onImport={onImport}
              onClear={onClear}
              compact
            />
            <AssetUploader
              slot="banner"
              label="Mini profile bg"
              hint="Top banner only"
              currentPath={bannerPath}
              onImport={onImport}
              onClear={onClear}
            />
            <AssetUploader
              slot="background"
              label="Profile background"
              hint="Page body below the banner"
              currentPath={backgroundPath}
              onImport={onImport}
              onClear={onClear}
            />
          </div>
        ) : null}
      </section>

      <ThemeSwitcher />
    </div>
  );
}

function ActivityGame({ game, onOpen }: { game: LibraryGame; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-sm bg-inset p-2 text-left hover:bg-hover"
    >
      <span className="h-[45px] w-[120px] shrink-0 overflow-hidden bg-chip">
        <SteamArt game={game} kind="header" className="size-full" fallback={game.name} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] text-ivory">{gameTitle(game)}</span>
        <span className="mt-0.5 block text-[12px] text-muted">
          {formatPlaytime(game.playtimeMinutes)} on record · {formatLastPlayed(game.lastPlayed)}
        </span>
      </span>
    </button>
  );
}

function SteamBox({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="glass-card rounded-2xl px-3.5 py-3">
      {title ? <h3 className="mb-2.5 text-[13px] font-semibold text-accent">{title}</h3> : null}
      {children}
    </section>
  );
}

function ProfileTab({
  children,
  active,
  onClick,
}: {
  children: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-b-2 px-3 py-2.5 text-[13px]",
        active
          ? "border-accent text-white"
          : "border-transparent text-ivory/65 hover:text-ivory",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-[0.12em] text-muted">{label.toUpperCase()}</span>
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-9 w-full rounded-sm border border-line bg-inset px-3 text-[13px] text-ivory outline-none focus:border-accent"
      />
    </label>
  );
}
