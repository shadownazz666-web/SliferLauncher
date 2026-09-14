import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  setPlayingPresence,
  syncDiscordPresenceForRoute,
} from "@/services/discord";
import {
  listenToSessionEnded,
  listenToSessionStarted,
} from "@/services/launcher";
import { minimizeWindow } from "@/lib/window";
import { useActivityStore } from "@/stores/activityStore";
import { useDiscordStore } from "@/stores/discordStore";
import { useLibraryStore } from "@/stores/libraryStore";
import { useUiStore } from "@/stores/uiStore";
import { APP_ROUTES } from "@/types/navigation";

let listenersBound = false;

function activePlaying(): {
  name: string;
  steamAppId?: number | null;
  profileLabel?: string | null;
} | null {
  const { games, runningGameIds } = useLibraryStore.getState();
  const active = games.find((game) => runningGameIds.includes(game.id));
  if (!active) {
    return null;
  }
  const profile = active.launchProfiles.find(
    (item) => item.id === active.defaultProfileId,
  );
  return {
    name: active.displayName?.trim() || active.name,
    steamAppId: active.steamAppId,
    profileLabel: profile?.label,
  };
}

async function bindPresenceListeners(): Promise<void> {
  if (listenersBound) {
    return;
  }
  listenersBound = true;

  await Promise.all([
    listenToSessionStarted((session) => {
      useActivityStore.getState().recordLaunch(session);

      if (useUiStore.getState().gameBoosterEnabled) {
        void minimizeWindow();
      }

      if (!useDiscordStore.getState().enabled) {
        return;
      }
      const game = useLibraryStore
        .getState()
        .games.find((item) => item.id === session.gameId);
      void setPlayingPresence(
        session.gameName || game?.displayName || game?.name || "a game",
        session.steamAppId ?? game?.steamAppId,
        session.profileLabel,
      );
    }),
    listenToSessionEnded((session) => {
      useActivityStore.getState().recordSessionEnd(session);

      if (!useDiscordStore.getState().enabled) {
        return;
      }
      const running = useLibraryStore.getState().runningGameIds;
      if (running.length === 0) {
        const path = window.location.hash.replace(/^#/, "") || window.location.pathname;
        void syncDiscordPresenceForRoute(path || "/library");
      }
    }),
  ]);
}

export function useDiscordPresence(): void {
  const enabled = useDiscordStore((state) => state.enabled);
  const clientId = useDiscordStore((state) => state.clientId);
  const apply = useDiscordStore((state) => state.apply);
  const hydrateActivity = useActivityStore((state) => state.hydrate);
  const location = useLocation();
  const runningGameIds = useLibraryStore((state) => state.runningGameIds);
  const updating = useUiStore((state) => state.updating);

  useEffect(() => {
    hydrateActivity();
    void bindPresenceListeners();
  }, [hydrateActivity]);

  useEffect(() => {
    void apply().then(() => {
      if (!enabled || !clientId) {
        return;
      }
      if (updating) {
        void syncDiscordPresenceForRoute(APP_ROUTES.updates);
        return;
      }
      const playing = activePlaying();
      void syncDiscordPresenceForRoute(location.pathname, {
        playingGameName: playing?.name ?? null,
        steamAppId: playing?.steamAppId,
        profileLabel: playing?.profileLabel,
      });
    });
  }, [apply, clientId, enabled, location.pathname, runningGameIds, updating]);
}
