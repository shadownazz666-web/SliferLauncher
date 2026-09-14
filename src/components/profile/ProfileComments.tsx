import { useEffect, useState, type FormEvent } from "react";
import { MessageSquare } from "lucide-react";
import { useT } from "@/i18n";
import { useCommentsStore } from "@/stores/commentsStore";

interface ProfileCommentsProps {
  authorName: string;
}

export function ProfileComments({ authorName }: ProfileCommentsProps) {
  const t = useT();
  const comments = useCommentsStore((state) => state.comments);
  const hydrate = useCommentsStore((state) => state.hydrate);
  const addComment = useCommentsStore((state) => state.addComment);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  function submit(event: FormEvent): void {
    event.preventDefault();
    addComment(authorName, draft);
    setDraft("");
  }

  return (
    <section className="glass-card rounded-xl px-4 py-3.5">
      <div className="mb-2 flex items-center gap-2">
        <MessageSquare className="size-3.5 text-accent" />
        <h3 className="text-[13px] font-semibold text-ivory">{t("profile.comments")}</h3>
      </div>
      <p className="mb-3 text-[12px] text-muted">{t("profile.commentsHint")}</p>

      <form onSubmit={submit} className="mb-3 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("profile.commentPlaceholder")}
          maxLength={500}
          className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-inset px-3 text-[13px] text-ivory outline-none placeholder:text-muted/70 focus:border-accent/50"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="shrink-0 rounded-lg bg-accent/90 px-3 text-[12px] font-semibold text-white disabled:opacity-45"
        >
          {t("profile.postComment")}
        </button>
      </form>

      {comments.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-muted">{t("profile.noComments")}</p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg bg-black/25 px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[13px] font-medium text-ivory">{comment.authorName}</p>
                <p className="shrink-0 text-[11px] text-muted">
                  {new Date(comment.at).toLocaleString()}
                </p>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-ivory/85">
                {comment.text}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
