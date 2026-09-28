import { useEffect, useState } from "react";
import { ExternalLink, Heart, Loader2, Search, ShoppingBag, X } from "lucide-react";
import { formatItadPrice } from "@/services/itad/client";
import {
  addToWaitlist,
  ensureItadAccessToken,
  removeFromWaitlist,
} from "@/services/itad";
import { itadConfigReady } from "@/services/itad/config";
import { useItadAuthStore } from "@/stores/itadAuthStore";
import { useStorefrontStore } from "@/stores/storefrontStore";
import { useUiStore } from "@/stores/uiStore";
import type { ItadDealListItem, ItadDealSort } from "@/types/itad";
import { APP_ROUTES } from "@/types/navigation";
import { Link } from "react-router-dom";

const SORT_OPTIONS: { value: ItadDealSort; label: string }[] = [
  { value: "-cut", label: "Biggest discount" },
  { value: "-rank", label: "Popularity" },
  { value: "price", label: "Lowest price" },
  { value: "-price", label: "Highest price" },
  { value: "title", label: "Title A–Z" },
];

export function StorePage() {
  const deals = useStorefrontStore((s) => s.deals);
  const searchResults = useStorefrontStore((s) => s.searchResults);
  const searchQuery = useStorefrontStore((s) => s.searchQuery);
  const sort = useStorefrontStore((s) => s.sort);
  const hasMore = useStorefrontStore((s) => s.hasMore);
  const loadingDeals = useStorefrontStore((s) => s.loadingDeals);
  const loadingMore = useStorefrontStore((s) => s.loadingMore);
  const searching = useStorefrontStore((s) => s.searching);
  const error = useStorefrontStore((s) => s.error);
  const selectedId = useStorefrontStore((s) => s.selectedId);
  const overview = useStorefrontStore((s) => s.overview);
  const overviewTitle = useStorefrontStore((s) => s.overviewTitle);
  const overviewLoading = useStorefrontStore((s) => s.overviewLoading);
  const loadDeals = useStorefrontStore((s) => s.loadDeals);
  const setSort = useStorefrontStore((s) => s.setSort);
  const setSearchQuery = useStorefrontStore((s) => s.setSearchQuery);
  const clearSearch = useStorefrontStore((s) => s.clearSearch);
  const openGame = useStorefrontStore((s) => s.openGame);
  const closeGame = useStorefrontStore((s) => s.closeGame);

  const connected = useItadAuthStore((s) => s.connected);
  const username = useItadAuthStore((s) => s.username);
  const connecting = useItadAuthStore((s) => s.connecting);
  const connect = useItadAuthStore((s) => s.connect);
  const isOwned = useItadAuthStore((s) => s.isOwned);
  const isWaitlisted = useItadAuthStore((s) => s.isWaitlisted);
  const setWaitlisted = useItadAuthStore((s) => s.setWaitlisted);
  const flashToast = useUiStore((s) => s.flashToast);

  const [waitlistBusy, setWaitlistBusy] = useState<string | null>(null);
  const showingSearch = searchQuery.trim().length > 0;

  useEffect(() => {
    void loadDeals(true);
  }, [loadDeals]);

  async function toggleWaitlist(gameId: string) {
    const token = await ensureItadAccessToken();
    if (!token) {
      flashToast("Connect your IsThereAnyDeal account to manage the waitlist.");
      return;
    }
    const on = isWaitlisted(gameId);
    setWaitlistBusy(gameId);
    try {
      if (on) {
        await removeFromWaitlist(token, [gameId]);
        setWaitlisted(gameId, false);
        flashToast("Removed from waitlist");
      } else {
        await addToWaitlist(token, [gameId]);
        setWaitlisted(gameId, true);
        flashToast("Added to waitlist");
      }
    } catch (err) {
      flashToast(err instanceof Error ? err.message : "Waitlist update failed");
    } finally {
      setWaitlistBusy(null);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-5 px-1 py-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ivory/40">IsThereAnyDeal</p>
          <h2 className="mt-1 text-2xl font-semibold text-ivory">Store</h2>
          <p className="mt-2 max-w-xl text-[13px] leading-5 text-muted">
            Live deals and price history across shops. Profile cosmetics live in the{" "}
            <Link to={APP_ROUTES.cosmetics} className="text-accent hover:underline">
              Cosmetic Store
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {connected ? (
            <p className="rounded-xl border border-line bg-chip/60 px-3 py-1.5 text-[12px] text-muted">
              ITAD · {username || "connected"}
            </p>
          ) : (
            <button
              type="button"
              disabled={connecting}
              onClick={() => void connect()}
              className="rounded-xl border border-accent/40 bg-accent/15 px-3 py-1.5 text-[12px] font-medium text-accent hover:bg-accent/25 disabled:opacity-50"
            >
              {connecting ? "Opening browser…" : "Connect ITAD account"}
            </button>
          )}
          {!itadConfigReady() ? (
            <Link
              to={APP_ROUTES.settings}
              className="rounded-xl border border-line px-3 py-1.5 text-[12px] text-ivory hover:bg-hover"
            >
              Add API key
            </Link>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-55 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search games…"
            className="h-10 w-full rounded-2xl border border-white/8 bg-black/20 pl-10 pr-9 text-sm outline-none focus:border-crimson/50"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => clearSearch()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:text-ivory"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </label>
        {!showingSearch ? (
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 rounded-2xl border border-white/8 bg-black/20 px-3 text-sm outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-[13px] text-accent">
          {error}
        </p>
      ) : null}

      {showingSearch ? (
        <section>
          <p className="mb-3 text-[12px] uppercase tracking-[0.14em] text-muted">
            {searching ? "Searching…" : `Results · ${searchResults.length}`}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {searchResults.map((game) => (
              <GameCard
                key={game.id}
                title={game.title}
                image={game.assets?.boxart || game.assets?.banner300}
                owned={isOwned(game.id)}
                waitlisted={isWaitlisted(game.id)}
                waitlistBusy={waitlistBusy === game.id}
                onOpen={() => void openGame(game.id, game.title)}
                onToggleWaitlist={connected ? () => void toggleWaitlist(game.id) : undefined}
              />
            ))}
          </div>
          {!searching && searchResults.length === 0 ? (
            <p className="text-sm text-muted">No games matched that search.</p>
          ) : null}
        </section>
      ) : (
        <section>
          <p className="mb-3 text-[12px] uppercase tracking-[0.14em] text-muted">Deals</p>
          {loadingDeals ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" />
              Loading deals…
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {deals.map((item) => (
                  <DealCard
                    key={`${item.id}-${item.deal.shop.id}`}
                    item={item}
                    owned={isOwned(item.id)}
                    waitlisted={isWaitlisted(item.id)}
                    waitlistBusy={waitlistBusy === item.id}
                    onOpen={() => void openGame(item.id, item.title)}
                    onToggleWaitlist={connected ? () => void toggleWaitlist(item.id) : undefined}
                  />
                ))}
              </div>
              {deals.length === 0 && !error ? (
                <p className="text-sm text-muted">No deals loaded yet.</p>
              ) : null}
              {hasMore ? (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void loadDeals(false)}
                  className="mt-4 rounded-xl border border-line px-4 py-2 text-[13px] text-ivory hover:bg-hover disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              ) : null}
            </>
          )}
        </section>
      )}

      {selectedId ? (
        <OverviewDrawer
          title={overviewTitle}
          loading={overviewLoading}
          overview={overview}
          owned={isOwned(selectedId)}
          waitlisted={isWaitlisted(selectedId)}
          waitlistBusy={waitlistBusy === selectedId}
          onClose={closeGame}
          onToggleWaitlist={connected ? () => void toggleWaitlist(selectedId) : undefined}
        />
      ) : null}
    </div>
  );
}

function DealCard({
  item,
  owned,
  waitlisted,
  waitlistBusy,
  onOpen,
  onToggleWaitlist,
}: {
  item: ItadDealListItem;
  owned: boolean;
  waitlisted: boolean;
  waitlistBusy: boolean;
  onOpen: () => void;
  onToggleWaitlist?: () => void;
}) {
  return (
    <GameCard
      title={item.title}
      image={item.assets?.boxart || item.assets?.banner300}
      shop={item.deal.shop.name}
      price={formatItadPrice(item.deal.price)}
      cut={item.deal.cut}
      owned={owned}
      waitlisted={waitlisted}
      waitlistBusy={waitlistBusy}
      onOpen={onOpen}
      onToggleWaitlist={onToggleWaitlist}
    />
  );
}

function GameCard({
  title,
  image,
  shop,
  price,
  cut,
  owned,
  waitlisted,
  waitlistBusy,
  onOpen,
  onToggleWaitlist,
}: {
  title: string;
  image?: string;
  shop?: string;
  price?: string;
  cut?: number;
  owned: boolean;
  waitlisted: boolean;
  waitlistBusy: boolean;
  onOpen: () => void;
  onToggleWaitlist?: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-inset/50">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="aspect-video bg-black/40">
          {image ? (
            <img src={image} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <div className="grid size-full place-items-center text-muted">
              <ShoppingBag className="size-8 opacity-40" />
            </div>
          )}
        </div>
        <div className="space-y-1.5 px-3 py-3">
          <div className="flex flex-wrap gap-1.5">
            {owned ? (
              <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
                Owned
              </span>
            ) : null}
            {waitlisted ? (
              <span className="rounded-md bg-sky-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-sky-300">
                Waitlist
              </span>
            ) : null}
          </div>
          <p className="line-clamp-2 text-[13px] font-medium text-ivory">{title}</p>
          {shop || price ? (
            <div className="flex items-center justify-between gap-2 text-[12px]">
              <span className="truncate text-muted">{shop}</span>
              <span className="tabular-nums text-gold">
                {cut && cut > 0 ? <span className="mr-1.5 text-accent">−{cut}%</span> : null}
                {price}
              </span>
            </div>
          ) : null}
        </div>
      </button>
      {onToggleWaitlist ? (
        <div className="border-t border-line px-3 py-2">
          <button
            type="button"
            disabled={waitlistBusy}
            onClick={onToggleWaitlist}
            className="flex items-center gap-1.5 text-[11px] text-muted hover:text-ivory disabled:opacity-50"
          >
            <Heart className={`size-3.5 ${waitlisted ? "fill-accent text-accent" : ""}`} />
            {waitlisted ? "On waitlist" : "Add to waitlist"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function OverviewDrawer({
  title,
  loading,
  overview,
  owned,
  waitlisted,
  waitlistBusy,
  onClose,
  onToggleWaitlist,
}: {
  title: string | null;
  loading: boolean;
  overview: import("@/types/itad").ItadOverviewPrice | null;
  owned: boolean;
  waitlisted: boolean;
  waitlistBusy: boolean;
  onClose: () => void;
  onToggleWaitlist?: () => void;
}) {
  const current = overview?.current;
  const lowest = overview?.lowest;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <button type="button" className="flex-1" aria-label="Close" onClick={onClose} />
      <aside className="flex h-full w-full max-w-md flex-col border-l border-line bg-chip/95 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Overview</p>
            <h3 className="mt-1 text-lg font-semibold text-ivory">{title || "Game"}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {owned ? (
                <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] uppercase text-emerald-300">
                  Owned
                </span>
              ) : null}
              {waitlisted ? (
                <span className="rounded-md bg-sky-500/20 px-1.5 py-0.5 text-[10px] uppercase text-sky-300">
                  On waitlist
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ivory"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" />
              Loading prices…
            </div>
          ) : overview ? (
            <>
              <div className="rounded-xl border border-line bg-inset/60 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Current best</p>
                {current ? (
                  <>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-gold">
                      {formatItadPrice(current.price)}
                      {current.cut > 0 ? (
                        <span className="ml-2 text-sm font-medium text-accent">−{current.cut}%</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-[13px] text-muted">
                      {current.shop.name}
                      {current.regular ? (
                        <span className="ml-2 line-through opacity-60">
                          {formatItadPrice(current.regular)}
                        </span>
                      ) : null}
                    </p>
                    {current.url ? (
                      <a
                        href={current.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
                      >
                        Buy at {current.shop.name}
                        <ExternalLink className="size-3.5" />
                      </a>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted">No current deal listed.</p>
                )}
              </div>
              <div className="rounded-xl border border-line bg-inset/60 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Historical low</p>
                {lowest ? (
                  <>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-ivory">
                      {formatItadPrice(lowest.price)}
                    </p>
                    <p className="mt-1 text-[12px] text-muted">
                      {lowest.shop.name}
                      {lowest.timestamp
                        ? ` · ${new Date(lowest.timestamp).toLocaleDateString()}`
                        : null}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted">No history yet.</p>
                )}
              </div>
              {overview.urls?.game ? (
                <a
                  href={overview.urls.game}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ivory"
                >
                  View on IsThereAnyDeal
                  <ExternalLink className="size-3.5" />
                </a>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted">Could not load overview.</p>
          )}
        </div>
        {onToggleWaitlist ? (
          <div className="border-t border-line px-4 py-3">
            <button
              type="button"
              disabled={waitlistBusy}
              onClick={onToggleWaitlist}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2 text-[13px] text-ivory hover:bg-hover disabled:opacity-50"
            >
              <Heart className={`size-4 ${waitlisted ? "fill-accent text-accent" : ""}`} />
              {waitlisted ? "Remove from waitlist" : "Add to waitlist"}
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
