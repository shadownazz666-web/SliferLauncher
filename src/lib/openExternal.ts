import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauriRuntime } from "@/lib/runtime";

export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export async function openExternal(url: string): Promise<void> {
  if (!isSafeHttpUrl(url)) {
    return;
  }
  if (isTauriRuntime()) {
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
