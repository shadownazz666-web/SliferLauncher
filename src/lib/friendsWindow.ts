import { WebviewWindow, getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriRuntime } from "@/lib/runtime";

const FRIENDS_LABEL = "friends";

export async function openFriendsWindow(): Promise<void> {
  if (!isTauriRuntime()) {
    globalThis.open("/#/friends", "slifer-friends", "width=320,height=700");
    return;
  }

  const existing = await WebviewWindow.getByLabel(FRIENDS_LABEL);
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }

  const friends = new WebviewWindow(FRIENDS_LABEL, {
    url: "index.html#/friends",
    title: "Friends",
    width: 320,
    height: 700,
    minWidth: 280,
    minHeight: 420,
    resizable: true,
    decorations: false,
    transparent: true,
    center: false,
    focus: true,
    visible: true,
  });

  friends.once("tauri://created", () => {
    void import("@tauri-apps/api/core").then(({ invoke }) =>
      invoke("apply_window_effects", { label: FRIENDS_LABEL }),
    );
  });

  friends.once("tauri://error", (event) => {
    console.warn("Friends window failed", event);
  });
}

export function isFriendsWindow(): boolean {
  if (!isTauriRuntime()) {
    return globalThis.location.hash.includes("/friends");
  }
  try {
    return getCurrentWebviewWindow().label === FRIENDS_LABEL;
  } catch {
    return globalThis.location.hash.includes("/friends");
  }
}
