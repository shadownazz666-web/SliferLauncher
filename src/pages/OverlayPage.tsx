import { useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { MessageCircle, Play, X } from "lucide-react";
import { SliferMark } from "@/components/brand/SliferMark";
import { openFriendsWindow } from "@/lib/friendsWindow";
import { isTauriRuntime } from "@/lib/runtime";
import { useLibraryStore } from "@/stores/libraryStore";

export function OverlayPage() {
  const games = useLibraryStore((state) => state.games);
  const runningIds = useLibraryStore((state) => state.runningGameIds);
  const loadGames = useLibraryStore((state) => state.loadGames);
  const active = useMemo(
    () => games.find((game) => runningIds.includes(game.id)) ?? null,
    [games, runningIds],
  );

  useEffect(() => {
    void loadGames();
    if (!isTauriRuntime()) {
      return;
    }
    void invoke("apply_window_effects", { label: "overlay" }).catch(() => undefined);

    let unlisten: (() => void) | undefined;
    void listen("slifer-overlay-toggle", () => {
      void loadGames();
    }).then((fn) => {
      unlisten = fn;
    });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        void hide();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlisten?.();
      window.removeEventListener("keydown", onKey);
    };
  }, [loadGames]);

  async function hide(): Promise<void> {
    if (!isTauriRuntime()) {
      return;
    }
    await invoke("hide_game_overlay");
  }

  return (
    <div className="overlay-frame flex h-full w-full flex-col text-ivory">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-6">
        <div className="flex items-center gap-3">
          <SliferMark className="size-8" />
          <div>
            <p className="text-[11px] tracking-[0.2em] text-gold/80 uppercase">Slifer Overlay</p>
            <p className="text-[15px] font-semibold">
              {active ? active.displayName?.trim() || active.name : "No active session"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void hide()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3 py-1.5 text-[12px] text-muted hover:bg-white/10 hover:text-ivory"
        >
          <X className="size-3.5" />
          Close (Shift+Tab)
        </button>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl">
          <h2 className="text-[13px] font-semibold tracking-wide text-accent uppercase">
            Now playing
          </h2>
          <p className="mt-3 text-[28px] font-semibold leading-tight">
            {active ? active.displayName?.trim() || active.name : "Launch a game from Slifer"}
          </p>
          <p className="mt-2 text-[13px] text-muted">
            Press <kbd className="rounded bg-white/10 px-1.5 py-0.5">Shift</kbd> +{" "}
            <kbd className="rounded bg-white/10 px-1.5 py-0.5">Tab</kbd> anytime during a session.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void hide()}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white"
            >
              <Play className="size-3.5 fill-current" />
              Return to game
            </button>
            <button
              type="button"
              onClick={() => void openFriendsWindow()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-[13px] text-ivory hover:bg-white/10"
            >
              <MessageCircle className="size-3.5" />
              Friends
            </button>
          </div>
        </section>

        <aside className="space-y-3">
          <section className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
            <h3 className="text-[12px] font-semibold tracking-wide text-muted uppercase">Quick</h3>
            <ul className="mt-3 space-y-2 text-[13px] text-ivory/85">
              <li>Achievements sync from the library game page</li>
              <li>Screenshots: F11 while Slifer is focused</li>
              <li>Game Booster restores when the session ends</li>
            </ul>
          </section>
          <section className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
            <h3 className="text-[12px] font-semibold tracking-wide text-muted uppercase">Session</h3>
            <p className="mt-2 text-[13px] text-muted">
              {runningIds.length > 0
                ? `${runningIds.length} active process${runningIds.length === 1 ? "" : "es"}`
                : "Idle"}
            </p>
          </section>
        </aside>
      </main>
    </div>
  );
}
