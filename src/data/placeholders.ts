export interface PlaceholderGame {
  id: string;
  title: string;
  genre: string;
  hoursPlayed: number;
  lastPlayed: string;
  accent: string;
}

export interface PlaceholderUpdate {
  id: string;
  gameTitle: string;
  headline: string;
  publishedAt: string;
  excerpt: string;
}

export interface PlaceholderProfile {
  displayName: string;
  handle: string;
  status: "Online" | "Away" | "Offline";
  initials: string;
  gamesOwned: number;
  hoursLogged: number;
}

export const CURRENT_USER: PlaceholderProfile = {
  displayName: "Shadownazz",
  handle: "commander",
  status: "Online",
  initials: "SN",
  gamesOwned: 24,
  hoursLogged: 186,
};

export const PLACEHOLDER_GAMES: PlaceholderGame[] = [
  {
    id: "eclipse-protocol",
    title: "Eclipse Protocol",
    genre: "Action RPG",
    hoursPlayed: 42,
    lastPlayed: "2 days ago",
    accent: "#e11d2e",
  },
  {
    id: "northwind-siege",
    title: "Northwind Siege",
    genre: "Strategy",
    hoursPlayed: 18,
    lastPlayed: "Yesterday",
    accent: "#5b8def",
  },
  {
    id: "velvet-horizon",
    title: "Velvet Horizon",
    genre: "Adventure",
    hoursPlayed: 27,
    lastPlayed: "5 days ago",
    accent: "#c46ad4",
  },
  {
    id: "iron-circuit",
    title: "Iron Circuit",
    genre: "Racing",
    hoursPlayed: 9,
    lastPlayed: "Last week",
    accent: "#e8c36a",
  },
  {
    id: "ashen-covenant",
    title: "Ashen Covenant",
    genre: "Souls-like",
    hoursPlayed: 61,
    lastPlayed: "Today",
    accent: "#d3541a",
  },
  {
    id: "lumen-drift",
    title: "Lumen Drift",
    genre: "Sci-Fi",
    hoursPlayed: 14,
    lastPlayed: "3 days ago",
    accent: "#3ec7c2",
  },
  {
    id: "hollow-arcade",
    title: "Hollow Arcade",
    genre: "Indie",
    hoursPlayed: 6,
    lastPlayed: "Never",
    accent: "#8d7cff",
  },
  {
    id: "red-banner",
    title: "Red Banner",
    genre: "Tactical",
    hoursPlayed: 33,
    lastPlayed: "4 days ago",
    accent: "#ff4d6d",
  },
];

export const PLACEHOLDER_UPDATES: PlaceholderUpdate[] = [
  {
    id: "upd-1",
    gameTitle: "Ashen Covenant",
    headline: "Patch 1.7 — Ember Wake",
    publishedAt: "Sep 4, 2026",
    excerpt: "New late-game route, parry timing polish, and a reworked boss in the Cinder Keep.",
  },
  {
    id: "upd-2",
    gameTitle: "Eclipse Protocol",
    headline: "Nightfall Operation",
    publishedAt: "Sep 2, 2026",
    excerpt: "Seasonal playlist, two operator kits, and a tighter stealth loop for urban maps.",
  },
  {
    id: "upd-3",
    gameTitle: "Northwind Siege",
    headline: "Balance Brief #12",
    publishedAt: "Aug 29, 2026",
    excerpt: "Cavalry charging costs reduced. Siege engines now lose accuracy in heavy snow.",
  },
];
