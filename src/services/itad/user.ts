import { itadFetch } from "@/services/itad/client";
import type { ItadGame, ItadUserInfo } from "@/types/itad";

export async function getUserInfo(accessToken: string): Promise<ItadUserInfo> {
  return itadFetch<ItadUserInfo>("/user/info/v2", {
    accessToken,
    skipApiKey: true,
  });
}

export async function getWaitlist(accessToken: string): Promise<ItadGame[]> {
  return itadFetch<ItadGame[]>("/waitlist/games/v1", {
    accessToken,
    skipApiKey: true,
  });
}

export async function addToWaitlist(
  accessToken: string,
  gameIds: string[],
): Promise<void> {
  const ids = [...new Set(gameIds.filter(Boolean))];
  if (ids.length === 0) {
    return;
  }
  await itadFetch<void>("/waitlist/games/v1", {
    method: "PUT",
    accessToken,
    skipApiKey: true,
    body: ids,
  });
}

export async function removeFromWaitlist(
  accessToken: string,
  gameIds: string[],
): Promise<void> {
  const ids = [...new Set(gameIds.filter(Boolean))];
  if (ids.length === 0) {
    return;
  }
  await itadFetch<void>("/waitlist/games/v1", {
    method: "DELETE",
    accessToken,
    skipApiKey: true,
    body: ids,
  });
}

export async function getCollection(accessToken: string): Promise<ItadGame[]> {
  return itadFetch<ItadGame[]>("/collection/games/v1", {
    accessToken,
    skipApiKey: true,
  });
}
