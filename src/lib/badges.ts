import { isSliferOwner, OWNER_BADGE } from "@/lib/owner";

export type FeaturedBadgeId = "level" | "owner";

export interface ProfileBadge {
  id: FeaturedBadgeId;
  name: string;
  description: string;
  imageSrc?: string;
}

export function availableBadges(username: string | null | undefined): ProfileBadge[] {
  const badges: ProfileBadge[] = [
    {
      id: "level",
      name: "Level",
      description: "Show your Slifer level in the corner.",
    },
  ];
  if (isSliferOwner(username)) {
    badges.push({
      id: "owner",
      name: OWNER_BADGE.name,
      description: OWNER_BADGE.description,
      imageSrc: OWNER_BADGE.imageSrc,
    });
  }
  return badges;
}

export function normalizeFeaturedBadgeId(
  value: string | null | undefined,
  username: string | null | undefined,
): FeaturedBadgeId {
  if (value === "owner" && isSliferOwner(username)) {
    return "owner";
  }
  return "level";
}
