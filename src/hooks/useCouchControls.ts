import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { filterLibrary } from "@/lib/librarySort";
import { toggleMainWindowVisible } from "@/services/media";
import { captureGameScreenshot } from "@/services/media";
import { useLibraryStore } from "@/stores/libraryStore";
import { useUiStore } from "@/stores/uiStore";
import { APP_ROUTES } from "@/types/navigation";

const DEADZONE = 0.28;

function pressed(gamepad: Gamepad, index: number): boolean {
  return Boolean(gamepad.buttons[index]?.pressed);
}

/**
 * Couch / virtual-mouse controls via the browser Gamepad API.
 * D-pad / left stick: library selection
 * A (0): launch selected
 * B (1): exit couch mode
 * Guide (16 or 9): show/hide Slifer
 * Right stick + RT: virtual mouse when enabled
 */
export function useCouchControls(): void {
  const navigate = useNavigate();
  const couchMode = useUiStore((state) => state.couchMode);
  const virtualMouse = useUiStore((state) => state.virtualMouse);
  const setCouchMode = useUiStore((state) => state.setCouchMode);
  const flashToast = useUiStore((state) => state.flashToast);
  const searchQuery = useUiStore((state) => state.searchQuery);
  const cursorRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const prevRef = useRef<Record<string, boolean>>({});
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const cursorEl = document.createElement("div");
    cursorEl.id = "slifer-virtual-cursor";
    cursorEl.style.cssText =
      "position:fixed;width:18px;height:18px;border:2px solid #e11d48;border-radius:9999px;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);display:none;box-shadow:0 0 0 2px rgba(0,0,0,.35)";
    document.body.appendChild(cursorEl);

    function edge(key: string, down: boolean): boolean {
      const prev = prevRef.current[key] ?? false;
      prevRef.current[key] = down;
      return down && !prev;
    }

    function tick() {
      const pads = navigator.getGamepads?.() ?? [];
      const pad = pads.find((item) => item);
      const showCursor = (couchMode || virtualMouse) && Boolean(pad);
      cursorEl.style.display = showCursor ? "block" : "none";

      if (!pad) {
        rafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      // Guide / start → toggle window
      if (edge("guide", pressed(pad, 16) || pressed(pad, 9))) {
        void toggleMainWindowVisible();
      }

      if (couchMode) {
        const games = filterLibrary(
          useLibraryStore.getState().games,
          "all",
          null,
          searchQuery,
        );
        const selectedId = useLibraryStore.getState().selectedGameId;
        const index = Math.max(
          0,
          games.findIndex((game) => game.id === selectedId),
        );
        const up = pressed(pad, 12) || (pad.axes[1] ?? 0) < -DEADZONE;
        const down = pressed(pad, 13) || (pad.axes[1] ?? 0) > DEADZONE;
        if (edge("up", up) && games[index - 1]) {
          useLibraryStore.getState().selectGame(games[index - 1].id);
          navigate(APP_ROUTES.library);
        }
        if (edge("down", down) && games[index + 1]) {
          useLibraryStore.getState().selectGame(games[index + 1].id);
          navigate(APP_ROUTES.library);
        }
        if (edge("a", pressed(pad, 0))) {
          const game = games[index];
          if (game) {
            void useLibraryStore.getState().launch(game.id);
          }
        }
        if (edge("b", pressed(pad, 1))) {
          setCouchMode(false);
          flashToast("Couch mode off");
        }
      }

      if (couchMode || virtualMouse) {
        const rx = pad.axes[2] ?? 0;
        const ry = pad.axes[3] ?? 0;
        if (Math.abs(rx) > DEADZONE || Math.abs(ry) > DEADZONE) {
          cursorRef.current.x = Math.min(
            window.innerWidth - 2,
            Math.max(2, cursorRef.current.x + rx * 14),
          );
          cursorRef.current.y = Math.min(
            window.innerHeight - 2,
            Math.max(2, cursorRef.current.y + ry * 14),
          );
        }
        cursorEl.style.left = `${cursorRef.current.x}px`;
        cursorEl.style.top = `${cursorRef.current.y}px`;

        if (edge("click", pressed(pad, 7) || pressed(pad, 5))) {
          const target = document.elementFromPoint(
            cursorRef.current.x,
            cursorRef.current.y,
          ) as HTMLElement | null;
          target?.click();
        }
      }

      rafRef.current = window.requestAnimationFrame(tick);
    }

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafRef.current);
      cursorEl.remove();
    };
  }, [
    couchMode,
    virtualMouse,
    navigate,
    setCouchMode,
    flashToast,
    searchQuery,
  ]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "F11") {
        return;
      }
      event.preventDefault();
      const gameId = useLibraryStore.getState().selectedGameId;
      if (!gameId) {
        flashToast("Select a game before capturing");
        return;
      }
      void captureGameScreenshot(gameId)
        .then(() => flashToast("Screenshot saved"))
        .catch((error) =>
          flashToast(error instanceof Error ? error.message : String(error)),
        );
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flashToast]);
}
