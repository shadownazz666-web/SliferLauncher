import { create } from "zustand";

export interface ProfileComment {
  id: string;
  authorName: string;
  text: string;
  at: string;
}

const STORAGE_KEY = "slifer.profileComments";
const MAX_COMMENTS = 80;

function readComments(): ProfileComment[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ProfileComment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeComments(comments: ProfileComment[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(comments.slice(0, MAX_COMMENTS)));
}

interface CommentsState {
  comments: ProfileComment[];
  hydrate: () => void;
  addComment: (authorName: string, text: string) => void;
  clear: () => void;
}

export const useCommentsStore = create<CommentsState>((set, get) => ({
  comments: [],
  hydrate: () => set({ comments: readComments() }),
  addComment: (authorName, text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const entry: ProfileComment = {
      id: `c-${Date.now()}`,
      authorName: authorName.trim() || "Player",
      text: trimmed.slice(0, 500),
      at: new Date().toISOString(),
    };
    const comments = [entry, ...get().comments].slice(0, MAX_COMMENTS);
    writeComments(comments);
    set({ comments });
  },
  clear: () => {
    writeComments([]);
    set({ comments: [] });
  },
}));
