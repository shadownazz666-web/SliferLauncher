import { useEffect } from "react";
import { MessageCircle, UserRound, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriRuntime } from "@/lib/runtime";
import { WindowControls } from "@/components/layout/WindowControls";

export function FriendsWindowPage() {
  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }
    void invoke("apply_window_effects", { label: "friends" }).catch(() => undefined);
  }, []);

  async function closeWindow(): Promise<void> {
    if (!isTauriRuntime()) {
      window.close();
      return;
    }
    await getCurrentWindow().close();
  }

  return (
    <div className="friends-frame app-frame slifer-frame has-glass flex h-full flex-col">
      <div
        className="slifer-header glass-header flex h-11 shrink-0 items-center justify-between border-b border-line px-2"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-2 px-2" data-tauri-drag-region>
          <MessageCircle className="size-3.5 text-accent" />
          <p className="text-[13px] font-semibold text-ivory">Friends</p>
        </div>
        <div className="flex items-center" onMouseDown={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={() => void closeWindow()}
            className="grid size-8 place-items-center text-muted hover:text-ivory"
            title="Close"
            aria-label="Close friends"
          >
            <X className="size-3.5" />
          </button>
          <WindowControls />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <FriendSection title="Online" count={0} empty="No friends online." />
        <FriendSection title="Offline" count={0} empty="Friends list coming soon." />
      </div>

      <div className="border-t border-line px-3 py-2.5">
        <p className="text-[11px] leading-4 text-muted">
          Detached chat window — presence sync arrives later.
        </p>
      </div>
    </div>
  );
}

function FriendSection({
  title,
  count,
  empty,
}: {
  title: string;
  count: number;
  empty: string;
}) {
  return (
    <section className="mb-3">
      <p className="px-2 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
        {title} ({count})
      </p>
      <div className="rounded-xl border border-line bg-black/45 px-3 py-6 text-center backdrop-blur-xl">
        <UserRound className="mx-auto mb-2 size-5 text-muted/50" />
        <p className="text-[12px] text-muted">{empty}</p>
      </div>
    </section>
  );
}
