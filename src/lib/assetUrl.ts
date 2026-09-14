import { convertFileSrc } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/lib/runtime";

export function toAssetUrl(
  path: string | null | undefined,
  cacheKey?: string | number | null,
): string | null {
  if (!path) {
    return null;
  }
  if (/^(https?:|blob:|data:)/i.test(path)) {
    return withCacheKey(path, cacheKey);
  }
  if (!isTauriRuntime()) {
    return withCacheKey(path, cacheKey);
  }

  try {
    const normalized = path.replace(/\//g, "\\");
    return withCacheKey(convertFileSrc(normalized), cacheKey);
  } catch {
    return null;
  }
}

function withCacheKey(url: string, cacheKey?: string | number | null): string {
  if (cacheKey == null || cacheKey === "") {
    return url;
  }
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}v=${encodeURIComponent(String(cacheKey))}`;
}
