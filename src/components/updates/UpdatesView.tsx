import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone, Newspaper, RefreshCcw } from "lucide-react";
import { UpdateArticle } from "@/components/updates/UpdateArticle";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { CLIENT_UPDATES } from "@/data/clientUpdates";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";
import { useLibraryStore } from "@/stores/libraryStore";
import { selectUnreadCount, useUpdatesStore } from "@/stores/updatesStore";
import { APP_ROUTES } from "@/types/navigation";

type UpdatesTab = "games" | "client";

export function UpdatesView() {
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const games = useLibraryStore((state) => state.games);
  const items = useUpdatesStore((state) => state.items);
  const seenIds = useUpdatesStore((state) => state.seenIds);
  const filterGameId = useUpdatesStore((state) => state.filterGameId);
  const isLoading = useUpdatesStore((state) => state.isLoading);
  const progressLabel = useUpdatesStore((state) => state.progressLabel);
  const error = useUpdatesStore((state) => state.error);
  const refresh = useUpdatesStore((state) => state.refresh);
  const markRead = useUpdatesStore((state) => state.markRead);
  const markAllRead = useUpdatesStore((state) => state.markAllRead);
  const setFilter = useUpdatesStore((state) => state.setFilter);
  const unreadCount = useUpdatesStore(selectUnreadCount);
  const [tab, setTab] = useState<UpdatesTab>(
    location.hash === "#client" ? "client" : "games",
  );

  const visibleGames = games.filter((game) => !game.isHidden);
  const filterGames = [...visibleGames].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const filtered = items.filter((item) =>
    filterGameId ? item.gameId === filterGameId : true,
  );
  const seen = new Set(seenIds);

  useEffect(() => {
    setTab(location.hash === "#client" ? "client" : "games");
  }, [location.hash]);

  function selectTab(next: UpdatesTab): void {
    setTab(next);
    navigate(
      next === "client" ? `${APP_ROUTES.updates}#client` : APP_ROUTES.updates,
      { replace: true },
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ivory/40">{t("updates.feed")}</p>
          <h2 className="mt-1 text-2xl font-semibold">
            {tab === "games" ? t("updates.gameHeading") : t("updates.clientHeading")}
          </h2>
        </div>
        {tab === "games" ? (
          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-ivory/55 hover:bg-white/6 hover:text-ivory"
              >
                {t("updates.markAllRead")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void refresh(visibleGames, true)}
              disabled={isLoading || visibleGames.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-crimson/80 px-3 py-2 text-sm font-medium hover:bg-crimson disabled:opacity-50"
            >
              <RefreshCcw className={cn("size-3.5", isLoading && "animate-spin")} />
              {isLoading ? t("updates.refreshing") : t("updates.refresh")}
            </button>
          </div>
        ) : null}
      </div>

      <div
        className="relative flex gap-1 rounded-2xl border border-line bg-black/25 p-1"
        role="tablist"
        aria-label="Updates source"
      >
        <TabButton active={tab === "games"} onClick={() => selectTab("games")}>
          {t("updates.gameHeading")}
        </TabButton>
        <TabButton active={tab === "client"} onClick={() => selectTab("client")}>
          {t("updates.clientHeading")}
        </TabButton>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === "games" ? (
          <motion.div
            key="games"
            role="tabpanel"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 18 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-4"
          >
            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterChip active={filterGameId === null} onClick={() => setFilter(null)}>
                {t("updates.allGames")}
              </FilterChip>
              {filterGames.map((game) => (
                <FilterChip
                  key={game.id}
                  active={filterGameId === game.id}
                  onClick={() => setFilter(filterGameId === game.id ? null : game.id)}
                >
                  {game.name}
                </FilterChip>
              ))}
            </div>

            {(isLoading || progressLabel || error) && (
              <GlassPanel className="px-4 py-3">
                <p className="text-sm text-ivory/80">
                  {error ?? progressLabel ?? t("updates.fetching")}
                </p>
              </GlassPanel>
            )}

            {filtered.length === 0 && !isLoading ? (
              <GlassPanel className="grid place-items-center px-6 py-12 text-center">
                <div>
                  <Newspaper className="mx-auto mb-3 size-8 text-ivory/35" />
                  <p className="text-lg font-medium">
                    {visibleGames.length === 0 ? t("updates.emptyGames") : t("updates.emptyFeed")}
                  </p>
                </div>
              </GlassPanel>
            ) : (
              <div className="relative space-y-3 pb-6 md:pl-6">
                {filtered.map((item) => (
                  <UpdateArticle
                    key={item.id}
                    item={item}
                    unread={!seen.has(item.id)}
                    onOpen={markRead}
                  />
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="client"
            role="tabpanel"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-4"
          >
            {CLIENT_UPDATES.length === 0 ? (
              <GlassPanel className="px-5 py-8 text-center text-sm text-muted">
                {t("updates.clientEmpty")}
              </GlassPanel>
            ) : (
              <div className="space-y-3 pb-6">
                {CLIENT_UPDATES.map((note) => (
                  <GlassPanel key={note.id} className="px-5 py-4">
                    <div className="mb-2 flex items-start gap-3">
                      <Megaphone className="mt-0.5 size-4 shrink-0 text-gold" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <p className="text-[15px] font-semibold text-ivory">{note.title}</p>
                          <span className="text-[12px] text-muted">v{note.version}</span>
                          <span className="text-[12px] text-muted">{note.date}</span>
                        </div>
                        <ul className="mt-2 space-y-1.5 text-[13px] leading-5 text-ivory/80">
                          {note.body.map((line) => (
                            <li key={line} className="flex gap-2">
                              <span className="text-gold/80">•</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </GlassPanel>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative flex-1 rounded-xl px-3 py-2 text-[13px] font-semibold tracking-wide transition-colors",
        active ? "text-ivory" : "text-muted hover:text-ivory",
      )}
    >
      {active ? (
        <motion.span
          layoutId="updates-tab-pill"
          className="absolute inset-0 rounded-xl bg-accent/25 shadow-[inset_0_0_0_1px_rgba(225,29,46,0.35)]"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      ) : null}
      <span className="relative z-[1]">{children}</span>
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex max-w-56 shrink-0 items-center truncate rounded-full px-3 py-1 text-xs uppercase tracking-[0.12em] transition-colors",
        active
          ? "bg-crimson/20 text-ivory shadow-[inset_0_0_0_1px_rgba(225,29,46,0.4)]"
          : "bg-white/5 text-ivory/55 hover:bg-white/8 hover:text-ivory",
      )}
    >
      {children}
    </button>
  );
}
