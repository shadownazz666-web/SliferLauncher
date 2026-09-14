export const PROFILE_STATUSES = ["Online", "Away", "Offline"] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export const PROFILE_ASSET_SLOTS = ["avatar", "banner", "background"] as const;
export type ProfileAssetSlot = (typeof PROFILE_ASSET_SLOTS)[number];

export interface AssetFocus {
  x: number;
  y: number;
}

export const DEFAULT_FOCUS: AssetFocus = { x: 50, y: 50 };

export interface UserProfile {
  username: string;
  handle: string;
  bio: string;
  avatarPath: string | null;
  bannerPath: string | null;
  backgroundPath: string | null;
  avatarFocus: AssetFocus;
  bannerFocus: AssetFocus;
  backgroundFocus: AssetFocus;
  status: ProfileStatus;
  countryCode: string | null;
  /** Corner emblem: level number ring, or a selected badge id. */
  featuredBadgeId: string;
}

export const DEFAULT_PROFILE: UserProfile = {
  username: "Shadownazz",
  handle: "commander",
  bio: "",
  avatarPath: null,
  bannerPath: null,
  backgroundPath: null,
  avatarFocus: { ...DEFAULT_FOCUS },
  bannerFocus: { ...DEFAULT_FOCUS },
  backgroundFocus: { ...DEFAULT_FOCUS },
  status: "Online",
  countryCode: null,
  featuredBadgeId: "level",
};

export function clampFocus(value: Partial<AssetFocus> | null | undefined): AssetFocus {
  const x = Number(value?.x);
  const y = Number(value?.y);
  return {
    x: Number.isFinite(x) ? Math.min(100, Math.max(0, x)) : 50,
    y: Number.isFinite(y) ? Math.min(100, Math.max(0, y)) : 50,
  };
}

export function focusCss(focus: AssetFocus | null | undefined): string {
  const next = clampFocus(focus);
  return `${next.x}% ${next.y}%`;
}

export function focusKey(slot: ProfileAssetSlot): "avatarFocus" | "bannerFocus" | "backgroundFocus" {
  if (slot === "avatar") {
    return "avatarFocus";
  }
  if (slot === "banner") {
    return "bannerFocus";
  }
  return "backgroundFocus";
}

export function pathKey(slot: ProfileAssetSlot): "avatarPath" | "bannerPath" | "backgroundPath" {
  if (slot === "avatar") {
    return "avatarPath";
  }
  if (slot === "banner") {
    return "bannerPath";
  }
  return "backgroundPath";
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return (name.trim().slice(0, 2) || "SN").toUpperCase();
}
