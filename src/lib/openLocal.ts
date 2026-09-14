import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { isTauriRuntime } from "@/lib/runtime";

export async function openLocalPath(path: string): Promise<void> {
  if (!path) {
    return;
  }
  if (!isTauriRuntime()) {
    return;
  }
  try {
    await openPath(path);
  } catch {
    await revealItemInDir(path);
  }
}
