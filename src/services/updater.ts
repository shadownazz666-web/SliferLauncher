import { isTauriRuntime } from "@/lib/runtime";
import { useUiStore } from "@/stores/uiStore";

export async function checkSilentUpdate(): Promise<void> {
  if (!isTauriRuntime() || import.meta.env.DEV) {
    return;
  }

  const setUpdating = useUiStore.getState().setUpdating;

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) {
      return;
    }
    setUpdating(true);
    try {
      await update.downloadAndInstall();
    } finally {
      setUpdating(false);
    }
  } catch {
    setUpdating(false);
    // Missing endpoint, unsigned build, or offline — stay on the current version.
  }
}

/** Show the UPDATING mark while downloading critical client files. */
export async function withUpdatingScreen<T>(work: () => Promise<T>): Promise<T> {
  const setUpdating = useUiStore.getState().setUpdating;
  setUpdating(true);
  try {
    return await work();
  } finally {
    setUpdating(false);
  }
}
