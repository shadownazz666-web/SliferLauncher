import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { isTauriRuntime } from "@/lib/runtime";

async function runWindowAction(action: () => Promise<void>): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  try {
    await action();
  } catch (error) {
    console.warn("Window action failed", error);
  }
}

export async function minimizeWindow(): Promise<void> {
  await runWindowAction(() => getCurrentWindow().minimize());
}

export async function toggleMaximizeWindow(): Promise<void> {
  await runWindowAction(() => getCurrentWindow().toggleMaximize());
}

export async function closeWindow(): Promise<void> {
  await runWindowAction(() => getCurrentWindow().close());
}

export async function subscribeWindowMaximized(
  onChange: (maximized: boolean) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    onChange(false);
    return () => undefined;
  }

  const appWindow = getCurrentWindow();
  onChange(await appWindow.isMaximized());

  return appWindow.onResized(async () => {
    onChange(await appWindow.isMaximized());
  });
}
