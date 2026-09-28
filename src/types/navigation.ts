export const APP_ROUTES = {
  store: "/store",
  cosmetics: "/cosmetics",
  library: "/library",
  updates: "/updates",
  profile: "/profile",
  settings: "/settings",
  wallet: "/wallet",
  friends: "/friends",
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

export interface NavItem {
  to: AppRoute;
  label: string;
  description: string;
}
