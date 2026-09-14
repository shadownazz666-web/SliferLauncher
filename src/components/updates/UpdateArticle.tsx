import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { RichUpdateBody } from "@/components/updates/RichUpdateBody";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { formatFeedDate } from "@/lib/relativeTime";
import { openExternal } from "@/lib/openExternal";
import { cn } from "@/lib/cn";
import type { UpdateItem } from "@/types/updates";

interface UpdateArticleProps {
  item: UpdateItem;
  unread: boolean;
  onOpen: (id: string) => void;
}

export function UpdateArticle({ item, unread, onOpen }: UpdateArticleProps) {
  const [open, setOpen] = useState(false);

  function toggle(): void {
    setOpen((current) => !current);
    onOpen(item.id);
  }

  return (
    <GlassPanel className="relative px-5 py-4">
      <span className="absolute top-5 bottom-5 -left-[21px] hidden w-px bg-white/10 md:block" />
      <span
        className={cn(
          "absolute top-6 -left-[25px] hidden size-2 rounded-full md:block",
          unread ? "bg-crimson-glow shadow-[0_0_10px_rgba(255,59,78,0.65)]" : "bg-ivory/25",
        )}
      />

      <button type="button" onClick={toggle} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              {unread ? (
                <span className="size-1.5 rounded-full bg-crimson-glow md:hidden" />
              ) : null}
              <p className="text-xs uppercase tracking-[0.16em] text-gold/80">
                {item.gameName}
              </p>
              <span className="text-ivory/25">·</span>
              <p className="text-xs text-ivory/40">{item.feedLabel}</p>
            </div>
            <h3 className="text-lg font-medium leading-snug">{item.title}</h3>
          </div>
          <ChevronDown
            className={cn(
              "mt-1 size-4 shrink-0 text-ivory/40 transition-transform",
              open && "rotate-180",
            )}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ivory/40">
          <span>{item.author}</span>
          <span>{formatFeedDate(item.publishedAt, item.publishedUnix)}</span>
        </div>
        {!open && item.summary ? (
          <p className="mt-2 text-sm leading-6 text-ivory/65">{item.summary}</p>
        ) : null}
      </button>

      {open ? (
        <div className="mt-4 border-t border-white/8 pt-4">
          <RichUpdateBody html={item.html} />
          <button
            type="button"
            onClick={() => void openExternal(item.url)}
            className="mt-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-crimson-glow hover:text-ivory"
          >
            <ExternalLink className="size-3.5" />
            Open source
          </button>
        </div>
      ) : null}
    </GlassPanel>
  );
}
