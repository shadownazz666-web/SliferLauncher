import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Backdrop } from "@/components/layout/Backdrop";
import { Header } from "@/components/layout/Header";
import { subscribeWindowMaximized } from "@/lib/window";
import { cn } from "@/lib/cn";
import { useDiscordPresence } from "@/hooks/useDiscordPresence";
import { useCouchControls } from "@/hooks/useCouchControls";
import { useGameScan } from "@/hooks/useGameScan";
import { useSliferCoins } from "@/hooks/useSliferCoins";
import { useUpdatesFeed } from "@/hooks/useUpdatesFeed";
import { checkSilentUpdate } from "@/services/updater";
import { useProfileStore } from "@/stores/profileStore";
import { useItadAuthStore } from "@/stores/itadAuthStore";
import { useUiStore } from "@/stores/uiStore";
import { APP_ROUTES } from "@/types/navigation";

export function AppShell() {
  useGameScan({ bootstrap: true });
  useDiscordPresence();
  useSliferCoins();
  useUpdatesFeed();
  useCouchControls();
  const hydrateProfile = useProfileStore((state) => state.hydrate);
  const hydrateItad = useItadAuthStore((state) => state.hydrate);
  const location = useLocation();
  const [maximized, setMaximized] = useState(false);
  const glass = useUiStore((state) => state.liquidGlassEnabled);
  const couchMode = useUiStore((state) => state.couchMode);

  useEffect(() => {
    void hydrateProfile();
    void hydrateItad();
    void checkSilentUpdate();
  }, [hydrateProfile, hydrateItad]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void subscribeWindowMaximized((next) => {
      if (!disposed) {
        setMaximized(next);
      }
    }).then((unsubscribe) => {
      if (disposed) {
        unsubscribe();
        return;
      }
      unlisten = unsubscribe;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const flushRoutes: string[] = [
    APP_ROUTES.library,
    APP_ROUTES.updates,
    APP_ROUTES.profile,
    APP_ROUTES.wallet,
  ];
  const flush = flushRoutes.includes(location.pathname);

  return (
    <div
      className={cn(
        "app-frame slifer-frame",
        glass && "has-glass",
        maximized && "is-maximized",
        couchMode && "couch-mode",
      )}
    >
      {glass ? <Backdrop /> : null}
      <div className="relative flex h-full flex-col">
        {couchMode ? (
          <div className="flex items-center justify-between border-b border-line px-4 py-2 text-[12px] text-muted">
            <span className="font-semibold tracking-wide text-accent">COUCH MODE</span>
            <span>D-pad navigate · A play · B exit · Guide show/hide · F11 screenshot</span>
          </div>
        ) : (
          <Header />
        )}
        <main className={cn("min-h-0 flex-1", !flush && "overflow-y-auto p-5")}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
