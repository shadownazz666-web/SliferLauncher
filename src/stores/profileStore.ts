import { create } from "zustand";
import { detectCountryCode } from "@/lib/countries";
import {
  clearProfileAsset,
  loadUserProfile,
  saveProfileAsset,
  saveUserProfile,
} from "@/services/profile";
import { useUiStore } from "@/stores/uiStore";
import {
  clampFocus,
  DEFAULT_FOCUS,
  DEFAULT_PROFILE,
  focusKey,
  pathKey,
  type AssetFocus,
  type ProfileAssetSlot,
  type ProfileStatus,
  type UserProfile,
} from "@/types/profile";

const STORAGE_KEY = "slifer.profile";

function normalizeProfile(raw: Partial<UserProfile> | null | undefined): UserProfile {
  const countryCode = raw?.countryCode?.trim().toUpperCase() || null;
  return {
    ...DEFAULT_PROFILE,
    ...raw,
    avatarFocus: clampFocus(raw?.avatarFocus ?? DEFAULT_FOCUS),
    bannerFocus: clampFocus(raw?.bannerFocus ?? DEFAULT_FOCUS),
    backgroundFocus: clampFocus(raw?.backgroundFocus ?? DEFAULT_FOCUS),
    status: asStatus(raw?.status ?? "Online"),
    countryCode,
    featuredBadgeId: (raw?.featuredBadgeId ?? "level").trim() || "level",
  };
}

function readCachedProfile(): UserProfile {
  if (typeof window === "undefined") {
    return DEFAULT_PROFILE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PROFILE;
    }
    return normalizeProfile(JSON.parse(raw) as Partial<UserProfile>);
  } catch {
    return DEFAULT_PROFILE;
  }
}

function cacheProfile(profile: UserProfile): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

let persistTimer: number | undefined;

function schedulePersist(persist: () => Promise<void>): void {
  if (typeof window === "undefined") {
    void persist();
    return;
  }
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    void persist();
  }, 280);
}

interface ProfileState extends UserProfile {
  assetRevision: number;
  hydrate: () => Promise<void>;
  persist: () => Promise<void>;
  setUsername: (username: string) => void;
  setHandle: (handle: string) => void;
  setBio: (bio: string) => void;
  setStatus: (status: ProfileStatus) => void;
  setCountryCode: (countryCode: string | null) => void;
  setFeaturedBadgeId: (featuredBadgeId: string) => void;
  importAsset: (slot: ProfileAssetSlot, file: File, focus?: AssetFocus) => Promise<void>;
  setAssetFocus: (slot: ProfileAssetSlot, focus: AssetFocus) => Promise<void>;
  removeAsset: (slot: ProfileAssetSlot) => Promise<void>;
}

function snapshot(state: ProfileState): UserProfile {
  return {
    username: state.username,
    handle: state.handle,
    bio: state.bio,
    avatarPath: state.avatarPath,
    bannerPath: state.bannerPath,
    backgroundPath: state.backgroundPath,
    avatarFocus: clampFocus(state.avatarFocus),
    bannerFocus: clampFocus(state.bannerFocus),
    backgroundFocus: clampFocus(state.backgroundFocus),
    status: state.status,
    countryCode: state.countryCode,
    featuredBadgeId: state.featuredBadgeId,
  };
}

function toastError(message: string): void {
  useUiStore.getState().flashToast(message);
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  ...readCachedProfile(),
  assetRevision: Date.now(),
  hydrate: async () => {
    try {
      let profile = normalizeProfile(await loadUserProfile());
      if (!profile.countryCode) {
        const detected = detectCountryCode();
        if (detected) {
          profile = { ...profile, countryCode: detected };
          cacheProfile(profile);
          set({ ...profile, assetRevision: Date.now() });
          try {
            const saved = normalizeProfile(await saveUserProfile(profile));
            cacheProfile(saved);
            set({ ...saved, assetRevision: Date.now() });
            return;
          } catch {
            // Keep detected country in local cache if remote save fails.
          }
        }
      }
      cacheProfile(profile);
      set({ ...profile, assetRevision: Date.now() });
    } catch {
      set({ ...readCachedProfile(), assetRevision: Date.now() });
    }
  },
  persist: async () => {
    const profile = snapshot(get());
    cacheProfile(profile);
    try {
      const saved = normalizeProfile(await saveUserProfile(profile));
      cacheProfile(saved);
      set({
        username: saved.username,
        handle: saved.handle,
        bio: saved.bio,
        avatarPath: saved.avatarPath,
        bannerPath: saved.bannerPath,
        backgroundPath: saved.backgroundPath,
        avatarFocus: saved.avatarFocus,
        bannerFocus: saved.bannerFocus,
        backgroundFocus: saved.backgroundFocus,
        status: saved.status,
        countryCode: saved.countryCode,
        featuredBadgeId: saved.featuredBadgeId,
      });
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Could not save profile");
    }
  },
  setUsername: (username) => {
    set({ username: username.trim() || DEFAULT_PROFILE.username });
    schedulePersist(() => get().persist());
  },
  setHandle: (handle) => {
    set({ handle: handle.replace(/^@/, "").trim() });
    schedulePersist(() => get().persist());
  },
  setBio: (bio) => {
    set({ bio });
    schedulePersist(() => get().persist());
  },
  setStatus: (status) => {
    set({ status });
    schedulePersist(() => get().persist());
  },
  setCountryCode: (countryCode) => {
    set({ countryCode: countryCode?.trim().toUpperCase() || null });
    schedulePersist(() => get().persist());
  },
  setFeaturedBadgeId: (featuredBadgeId) => {
    set({ featuredBadgeId: featuredBadgeId.trim() || "level" });
    schedulePersist(() => get().persist());
  },
  importAsset: async (slot, file, focus) => {
    try {
      const path = await saveProfileAsset(slot, file);
      set({
        [pathKey(slot)]: path,
        [focusKey(slot)]: clampFocus(focus ?? DEFAULT_FOCUS),
        assetRevision: Date.now(),
      });
      await get().persist();
      useUiStore.getState().flashToast(`${slot} updated`);
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Could not save artwork");
      throw error;
    }
  },
  setAssetFocus: async (slot, focus) => {
    set({ [focusKey(slot)]: clampFocus(focus), assetRevision: Date.now() });
    await get().persist();
  },
  removeAsset: async (slot) => {
    try {
      await clearProfileAsset(slot);
      set({
        [pathKey(slot)]: null,
        [focusKey(slot)]: { ...DEFAULT_FOCUS },
        assetRevision: Date.now(),
      });
      await get().persist();
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Could not remove artwork");
      throw error;
    }
  },
}));

function asStatus(value: string): ProfileStatus {
  if (value === "Away" || value === "Offline" || value === "Online") {
    return value;
  }
  return "Online";
}
