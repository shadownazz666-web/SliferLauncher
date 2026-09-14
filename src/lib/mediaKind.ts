const VIDEO_EXT = /\.(mp4|webm)$/i;

export function isVideoAsset(path: string | null | undefined): boolean {
  return Boolean(path && VIDEO_EXT.test(path));
}

export const PROFILE_ASSET_ACCEPT =
  "image/gif,image/png,image/jpeg,image/webp,image/jpg,video/webm,video/mp4,.gif,.png,.jpg,.jpeg,.webp,.webm,.mp4";
