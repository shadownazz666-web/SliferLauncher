import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriRuntime } from "@/lib/runtime";

const OVERLAY_LABEL = "overlay";

export function isOverlayWindow(): boolean {
  if (!isTauriRuntime()) {
    return globalThis.location.hash.includes("/overlay");
  }
  try {
    return getCurrentWebviewWindow().label === OVERLAY_LABEL;
  } catch {
    return globalThis.location.hash.includes("/overlay");
  }
}
