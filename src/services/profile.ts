import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/lib/runtime";
import {
  DEFAULT_PROFILE,
  type ProfileAssetSlot,
  type UserProfile,
} from "@/types/profile";

export async function loadUserProfile(): Promise<UserProfile> {
  if (!isTauriRuntime()) {
    return DEFAULT_PROFILE;
  }
  return invoke<UserProfile>("load_user_profile");
}

export async function saveUserProfile(profile: UserProfile): Promise<UserProfile> {
  if (!isTauriRuntime()) {
    return profile;
  }
  return invoke<UserProfile>("save_user_profile", { profile });
}

export async function saveProfileAsset(
  slot: ProfileAssetSlot,
  file: File,
): Promise<string> {
  if (!isTauriRuntime()) {
    return URL.createObjectURL(file);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return invoke<string>("save_profile_asset", {
    slot,
    filename: file.name,
    data: Array.from(bytes),
  });
}

export async function clearProfileAsset(slot: ProfileAssetSlot): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  await invoke("clear_profile_asset", { slot });
}
