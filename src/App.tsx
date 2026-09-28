import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { UpdatingScreen } from "@/components/UpdatingScreen";
import { useThemeEngine } from "@/hooks/useThemeEngine";
import { isFriendsWindow } from "@/lib/friendsWindow";
import { isOverlayWindow } from "@/lib/overlayWindow";
import { CosmeticStorePage } from "@/pages/CosmeticStorePage";
import { FriendsWindowPage } from "@/pages/FriendsWindowPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { OverlayPage } from "@/pages/OverlayPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SetupPage } from "@/pages/SetupPage";
import { StorePage } from "@/pages/StorePage";
import { UpdatesPage } from "@/pages/UpdatesPage";
import { WalletPage } from "@/pages/WalletPage";
import { useSetupStore } from "@/stores/setupStore";
import { useUiStore } from "@/stores/uiStore";
import { APP_ROUTES } from "@/types/navigation";

export default function App() {
  useThemeEngine();
  const ready = useSetupStore((state) => state.ready);
  const setupComplete = useSetupStore((state) => state.setupComplete);
  const hydrateSetup = useSetupStore((state) => state.hydrate);
  const toast = useUiStore((state) => state.toast);
  const updating = useUiStore((state) => state.updating);
  const friendsWindow = isFriendsWindow();
  const overlayWindow = isOverlayWindow();

  useEffect(() => {
    void hydrateSetup();
  }, [hydrateSetup]);

  if (overlayWindow) {
    return <OverlayPage />;
  }

  if (friendsWindow) {
    return <FriendsWindowPage />;
  }

  if (updating) {
    return <UpdatingScreen />;
  }

  if (!ready) {
    return (
      <div className="app-frame slifer-frame has-glass grid h-full place-items-center text-[13px] text-muted">
        Loading…
      </div>
    );
  }

  return (
    <>
      {!setupComplete ? (
        <SetupPage />
      ) : (
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to={APP_ROUTES.library} replace />} />
            <Route path={APP_ROUTES.store} element={<StorePage />} />
            <Route path={APP_ROUTES.cosmetics} element={<CosmeticStorePage />} />
            <Route path={APP_ROUTES.library} element={<LibraryPage />} />
            <Route path={APP_ROUTES.updates} element={<UpdatesPage />} />
            <Route path={APP_ROUTES.profile} element={<ProfilePage />} />
            <Route path={APP_ROUTES.settings} element={<SettingsPage />} />
            <Route path={APP_ROUTES.wallet} element={<WalletPage />} />
            <Route path={APP_ROUTES.friends} element={<FriendsWindowPage />} />
            <Route path="/overlay" element={<OverlayPage />} />
            <Route path="/community" element={<Navigate to={APP_ROUTES.updates} replace />} />
            <Route path="*" element={<Navigate to={APP_ROUTES.library} replace />} />
          </Route>
        </Routes>
      )}
      {toast ? (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-line bg-chip/95 px-4 py-2 text-[13px] text-ivory shadow-lg backdrop-blur-md">
          {toast}
        </div>
      ) : null}
    </>
  );
}
