export interface ClientUpdateNote {
  id: string;
  version: string;
  date: string;
  title: string;
  body: string[];
}

/** Slifer client changelog — shown under Client Updates / megaphone. */
export const CLIENT_UPDATES: ClientUpdateNote[] = [
  {
    id: "0.1.4-itad-store",
    version: "0.1.4",
    date: "2026-09-28",
    title: "Store deals & Cosmetic Store",
    body: [
      "Store now shows IsThereAnyDeal deals, search, and price overview",
      "Link your ITAD account for owned/waitlist badges (OAuth via mylauncher://auth)",
      "Profile cosmetics moved to a separate Cosmetic Store route",
      "Add your ITAD API key and OAuth client ID under Settings",
    ],
  },
  {
    id: "0.1.3-slifer-coins",
    version: "0.1.3",
    date: "2026-09-06",
    title: "Slifer Coins",
    body: [
      "Wallet now uses Slifer Coins (SC) instead of a dollar balance",
      "Earn slowly from launches, client presence, and longer play sessions",
      "Recent activity lists coin gains and future store purchases by product name",
      "Store previews show SC prices for upcoming cosmetics",
    ],
  },
  {
    id: "0.1.2-profile-discord",
    version: "0.1.2",
    date: "2026-09-06",
    title: "Profile badges & Discord stick",
    body: [
      "Games collected moved into the Status card; Badges stays its own tab card",
      "Click the corner level badge to feature Level or Owner art",
      "Discord Rich Presence heartbeats every 12s and recovers missing art assets",
      "Settings explains Registered Games vs Rich Presence and adds Push presence now",
    ],
  },
  {
    id: "0.1.1-discord-community",
    version: "0.1.1",
    date: "2026-09-06",
    title: "Community tabs & Discord presence",
    body: [
      "Guides and Discussions are now dedicated in-client boards (not Steam links)",
      "PLAY and profile dropdown merged into one split control",
      "Discord presence no longer uses broken Steam CDN image URLs",
      "Executable renamed to Slifer Launcher to avoid Discord Registered Games conflicts",
      "Owner badge for the Slifer founder account",
    ],
  },
  {
    id: "0.1.0-wave",
    version: "0.1.0",
    date: "2026-09-06",
    title: "Slifer foundation",
    body: [
      "Game library pages with post-game summary and activity feed",
      "In-game overlay (Shift+Tab) and frosted friends window",
      "Achievements sync, rare glow, and perfect-clear rim",
      "Locale support for English, Spanish, French, German, Portuguese, Japanese, Korean, and Simplified Chinese",
      "Profile comments and client update notes",
    ],
  },
];
