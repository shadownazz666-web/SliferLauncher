/** Hardcoded Slifer owner accounts — receive the Owner badge. */
export const OWNER_USERNAMES = ["Shadownazz"] as const;

export function isSliferOwner(username: string | null | undefined): boolean {
  const name = username?.trim().toLowerCase() ?? "";
  if (!name) {
    return false;
  }
  return OWNER_USERNAMES.some((owner) => owner.toLowerCase() === name);
}

export const OWNER_BADGE = {
  id: "owner",
  name: "Owner",
  description: "Founder of Slifer.",
  imageSrc: "/badges/owner.png",
} as const;
