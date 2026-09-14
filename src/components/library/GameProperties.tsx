import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { SteamArt } from "@/components/library/SteamArt";
import { openLocalPath } from "@/lib/openLocal";
import { useLibraryStore } from "@/stores/libraryStore";
import type { LibraryGame } from "@/types/library";

interface GamePropertiesProps {
  game: LibraryGame;
  onClose: () => void;
}

export function GameProperties({ game, onClose }: GamePropertiesProps) {
  const savePreferences = useLibraryStore((state) => state.savePreferences);
  const current = useLibraryStore(
    (state) => state.games.find((item) => item.id === game.id) ?? game,
  );
  const [launchArgs, setLaunchArgs] = useState(current.launchArgs ?? "");
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    setLaunchArgs(current.launchArgs ?? "");
  }, [current.id, current.launchArgs]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function addTag(): Promise<void> {
    const next = tagDraft.trim();
    if (!next || current.customTags.some((tag) => tag.toLowerCase() === next.toLowerCase())) {
      setTagDraft("");
      return;
    }
    await savePreferences({
      gameId: current.id,
      customTags: [...current.customTags, next],
    });
    setTagDraft("");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-6">
      <button type="button" className="absolute inset-0" aria-label="Close properties" onClick={onClose} />
      <section className="glass-menu relative z-10 w-full max-w-xl overflow-hidden rounded-2xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-[14px] font-semibold text-white">{current.name} — Properties</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-7 place-items-center text-muted hover:text-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex gap-4 px-4 py-4">
          <div className="h-36 w-24 shrink-0 overflow-hidden bg-inset">
            <SteamArt game={current} kind="cover" className="size-full" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <Field label="Installed in">
              <button
                type="button"
                onClick={() => void openLocalPath(current.installDir)}
                className="w-full truncate text-left text-[13px] text-accent hover:underline"
                title={current.installDir}
              >
                {current.installDir}
              </button>
            </Field>
            <Field label="Launch options">
              <input
                value={launchArgs}
                onChange={(event) => setLaunchArgs(event.target.value)}
                onBlur={() => {
                  if ((current.launchArgs ?? "") !== launchArgs) {
                    void savePreferences({ gameId: current.id, launchArgs });
                  }
                }}
                placeholder="-windowed -noborder"
                className="h-8 w-full rounded-sm border border-line bg-inset px-2 text-[13px] text-ivory outline-none focus:border-accent"
              />
            </Field>
            <Field label="Categories">
              <div className="flex flex-wrap gap-1.5">
                {current.customTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      void savePreferences({
                        gameId: current.id,
                        customTags: current.customTags.filter((item) => item !== tag),
                      })
                    }
                    className="rounded-lg bg-chip px-2 py-0.5 text-[12px] text-ivory hover:bg-accent"
                    title="Remove category"
                  >
                    {tag}
                  </button>
                ))}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void addTag();
                  }}
                >
                  <input
                    value={tagDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    placeholder="Add..."
                    className="h-6 w-24 rounded-sm border border-line bg-inset px-2 text-[12px] outline-none focus:border-accent"
                  />
                </form>
              </div>
            </Field>
            {current.steamAppId ? (
              <p className="text-[12px] text-muted">Steam App ID {current.steamAppId}</p>
            ) : null}
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-chip px-4 py-1.5 text-[13px] text-ivory hover:bg-hover"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-[0.12em] text-muted">{label.toUpperCase()}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
