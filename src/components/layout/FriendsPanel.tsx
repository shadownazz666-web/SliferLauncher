import { MessageCircle, UserRound, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface FriendsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function FriendsPanel({ open, onClose }: FriendsPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <aside
      className={cn(
        "glass-menu absolute top-[52px] right-0 bottom-0 z-200 flex w-[280px] flex-col border-l border-line",
        "shadow-[-12px_0_32px_rgba(0,0,0,0.35)]",
      )}
      aria-label="Friends"
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-3.5 text-accent" />
          <p className="text-[13px] font-semibold text-ivory">Friends</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-7 place-items-center rounded-lg text-muted hover:bg-hover hover:text-ivory"
          title="Close"
          aria-label="Close friends"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <FriendSection title="Online" count={0} empty="No friends online." />
        <FriendSection title="Offline" count={0} empty="Friends list coming soon." />
      </div>

      <div className="border-t border-line px-3 py-2.5">
        <p className="text-[11px] leading-4 text-muted">
          Chat and presence are placeholders for now.
        </p>
      </div>
    </aside>
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
      <div className="rounded-xl bg-inset/50 px-3 py-6 text-center">
        <UserRound className="mx-auto mb-2 size-5 text-muted/50" />
        <p className="text-[12px] text-muted">{empty}</p>
      </div>
    </section>
  );
}
