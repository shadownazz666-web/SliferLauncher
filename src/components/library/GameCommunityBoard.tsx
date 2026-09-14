import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BookOpen, MessagesSquare } from "lucide-react";
import { useProfileStore } from "@/stores/profileStore";
import type { LibraryGame } from "@/types/library";

type BoardKind = "discussions" | "guides";

interface BoardPost {
  id: string;
  author: string;
  title: string;
  body: string;
  at: string;
}

function storageKey(gameId: string, kind: BoardKind): string {
  return `slifer.board.${kind}.${gameId}`;
}

function readPosts(gameId: string, kind: BoardKind): BoardPost[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(storageKey(gameId, kind));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as BoardPost[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePosts(gameId: string, kind: BoardKind, posts: BoardPost[]): void {
  window.localStorage.setItem(storageKey(gameId, kind), JSON.stringify(posts.slice(0, 80)));
}

interface GameCommunityBoardProps {
  game: LibraryGame;
  kind: BoardKind;
}

export function GameCommunityBoard({ game, kind }: GameCommunityBoardProps) {
  const username = useProfileStore((state) => state.username);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    setPosts(readPosts(game.id, kind));
    setTitle("");
    setBody("");
  }, [game.id, kind]);

  const heading = kind === "guides" ? "Guides" : "Discussions";
  const Icon = kind === "guides" ? BookOpen : MessagesSquare;
  const placeholderTitle =
    kind === "guides" ? "Guide title (e.g. Beginner tips)" : "Topic title";
  const placeholderBody =
    kind === "guides"
      ? "Write your guide steps here…"
      : "Start a discussion with other Slifer players on this machine…";

  const sorted = useMemo(
    () => [...posts].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
    [posts],
  );

  function submit(event: FormEvent): void {
    event.preventDefault();
    const nextTitle = title.trim();
    const nextBody = body.trim();
    if (!nextTitle || !nextBody) {
      return;
    }
    const entry: BoardPost = {
      id: `${kind}-${Date.now()}`,
      author: username.trim() || "Player",
      title: nextTitle.slice(0, 120),
      body: nextBody.slice(0, 4000),
      at: new Date().toISOString(),
    };
    const next = [entry, ...posts].slice(0, 80);
    writePosts(game.id, kind, next);
    setPosts(next);
    setTitle("");
    setBody("");
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-accent" />
        <div>
          <h3 className="text-[15px] font-semibold text-ivory">{heading}</h3>
          <p className="text-[12px] text-muted">
            Local to this Slifer install — not Steam Community.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="glass-card space-y-2 rounded-xl px-4 py-3.5">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={placeholderTitle}
          maxLength={120}
          className="h-9 w-full rounded-lg border border-line bg-inset px-3 text-[13px] text-ivory outline-none placeholder:text-muted/70 focus:border-accent/50"
        />
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={placeholderBody}
          maxLength={4000}
          rows={4}
          className="w-full resize-y rounded-lg border border-line bg-inset px-3 py-2 text-[13px] text-ivory outline-none placeholder:text-muted/70 focus:border-accent/50"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!title.trim() || !body.trim()}
            className="rounded-lg bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-45"
          >
            {kind === "guides" ? "Publish guide" : "Post topic"}
          </button>
        </div>
      </form>

      {sorted.length === 0 ? (
        <div className="glass-card rounded-xl px-4 py-10 text-center text-[13px] text-muted">
          No {heading.toLowerCase()} yet. Be the first to post for{" "}
          {game.displayName?.trim() || game.name}.
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((post) => (
            <article key={post.id} className="glass-card rounded-xl px-4 py-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-[14px] font-semibold text-ivory">{post.title}</h4>
                <p className="text-[11px] text-muted">
                  {post.author} · {new Date(post.at).toLocaleString()}
                </p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-ivory/85">
                {post.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
