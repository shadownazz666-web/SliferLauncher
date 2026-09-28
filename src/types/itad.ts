export interface ItadPrice {
  amount: number;
  amountInt: number;
  currency: string;
}

export interface ItadShop {
  id: number;
  name: string;
}

export interface ItadAssets {
  banner145?: string;
  banner300?: string;
  banner400?: string;
  banner600?: string;
  boxart?: string;
}

export interface ItadGame {
  id: string;
  slug: string;
  title: string;
  type?: string | null;
  mature?: boolean;
  assets?: ItadAssets | null;
}

export interface ItadDeal {
  shop: ItadShop;
  price: ItadPrice;
  regular: ItadPrice;
  cut: number;
  voucher: string | null;
  storeLow?: ItadPrice | null;
  historyLow?: ItadPrice | null;
  historyLow_1y?: ItadPrice | null;
  historyLow_3m?: ItadPrice | null;
  flag?: string | null;
  drm?: unknown;
  platforms?: unknown;
  timestamp?: string;
  expiry?: string | null;
  url: string;
}

export interface ItadDealListItem extends ItadGame {
  deal: ItadDeal;
}

export interface ItadDealsResponse {
  nextOffset: number;
  hasMore: boolean;
  list: ItadDealListItem[];
}

export interface ItadHistoryLow {
  shop: ItadShop;
  price: ItadPrice;
  regular: ItadPrice;
  cut: number;
  timestamp: string;
}

export interface ItadOverviewPrice {
  id: string;
  current: ItadDeal | null;
  lowest: ItadHistoryLow | null;
  bundled: number;
  urls: { game: string };
}

export interface ItadOverviewResponse {
  prices: ItadOverviewPrice[];
  bundles: unknown[];
}

export interface ItadUserInfo {
  username: string | null;
}

export type ItadDealSort = "-cut" | "cut" | "price" | "-price" | "rank" | "-rank" | "title" | "-title";

export interface ItadDealsQuery {
  country?: string;
  offset?: number;
  limit?: number;
  sort?: ItadDealSort | string;
  nondeals?: boolean;
  mature?: boolean;
}
