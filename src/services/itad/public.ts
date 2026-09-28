import { getItadConfig } from "@/services/itad/config";
import { itadFetch } from "@/services/itad/client";
import type {
  ItadDealsQuery,
  ItadDealsResponse,
  ItadGame,
  ItadOverviewResponse,
} from "@/types/itad";

export async function searchGames(
  title: string,
  results = 20,
): Promise<ItadGame[]> {
  const trimmed = title.trim();
  if (!trimmed) {
    return [];
  }
  return itadFetch<ItadGame[]>("/games/search/v1", {
    query: { title: trimmed, results: Math.min(100, Math.max(1, results)) },
  });
}

export async function listDeals(query: ItadDealsQuery = {}): Promise<ItadDealsResponse> {
  const config = getItadConfig();
  return itadFetch<ItadDealsResponse>("/deals/v2", {
    query: {
      country: query.country ?? config.country ?? "US",
      offset: query.offset ?? 0,
      limit: query.limit ?? 24,
      sort: query.sort ?? "-cut",
      nondeals: query.nondeals ?? false,
      mature: query.mature ?? false,
    },
  });
}

export async function gameOverview(
  ids: string[],
  country?: string,
): Promise<ItadOverviewResponse> {
  const config = getItadConfig();
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 200);
  if (unique.length === 0) {
    return { prices: [], bundles: [] };
  }
  return itadFetch<ItadOverviewResponse>("/games/overview/v2", {
    method: "POST",
    query: { country: country ?? config.country ?? "US" },
    body: unique,
  });
}
