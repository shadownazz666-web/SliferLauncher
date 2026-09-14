import { useEffect, useState } from "react";
import { toAssetUrl } from "@/lib/assetUrl";
import {
  captureGameScreenshot,
  listGameMedia,
  type MediaItem,
} from "@/services/media";
import type { LibraryGame } from "@/types/library";

interface GameMediaPanelProps {
  game: LibraryGame;
  onClose?: () => void;
}

export function GameMediaPanel({ game, onClose }: GameMediaPanelProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      setItems(await listGameMedia(game.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [game.id]);

  const stills = items.filter((item) => item.kind === "image");
  const clips = items.filter((item) => item.kind === "clip");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-white">Media</h3>
          <p className="mt-1 text-[12px] text-muted">
            Stills first, then clips. Press F11 anytime to capture the screen for this game.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={capturing}
            onClick={() => {
              setCapturing(true);
              void captureGameScreenshot(game.id)
                .then(() => refresh())
                .catch((err) =>
                  setError(err instanceof Error ? err.message : String(err)),
                )
                .finally(() => setCapturing(false));
            }}
            className="rounded-sm bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-45"
          >
            {capturing ? "Capturing…" : "Capture (F11)"}
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

      {error ? <p className="text-[12px] text-rose-300">{error}</p> : null}
      {loading ? <p className="text-[13px] text-muted">Loading media…</p> : null}

      <section className="space-y-2">
        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-accent">Stills</h4>
        {stills.length === 0 ? (
          <p className="text-[12px] text-muted">No screenshots yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {stills.map((item) => {
              const src = toAssetUrl(item.path);
              return src ? (
                <img
                  key={item.id}
                  src={src}
                  alt=""
                  className="aspect-video w-full rounded-sm object-cover"
                  draggable={false}
                />
              ) : null;
            })}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-accent">Clips</h4>
        {clips.length === 0 ? (
          <p className="text-[12px] text-muted">No short clips saved yet.</p>
        ) : (
          <div className="space-y-2">
            {clips.map((item) => (
              <p key={item.id} className="truncate text-[12px] text-muted">
                {item.path}
              </p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
