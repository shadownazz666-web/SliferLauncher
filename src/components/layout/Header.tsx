import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, Megaphone, MessageCircle } from "lucide-react";
import { SliferMark } from "@/components/brand/SliferMark";
import { MediaAsset } from "@/components/profile/MediaAsset";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { WindowControls } from "@/components/layout/WindowControls";
import { useT } from "@/i18n";
import { openFriendsWindow } from "@/lib/friendsWindow";
import { toggleMaximizeWindow } from "@/lib/window";
import { cn } from "@/lib/cn";
import { useProfileStore } from "@/stores/profileStore";
import { selectUnreadCount, useUpdatesStore } from "@/stores/updatesStore";
import { initialsFromName } from "@/types/profile";
import { APP_ROUTES } from "@/types/navigation";

export function Header() {
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const username = useProfileStore((state) => state.username);
  const avatarPath = useProfileStore((state) => state.avatarPath);
  const avatarFocus = useProfileStore((state) => state.avatarFocus);
  const assetRevision = useProfileStore((state) => state.assetRevision);
  const unread = useUpdatesStore(selectUnreadCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  const topNav = [
    { to: APP_ROUTES.store, label: t("nav.store") },
    { to: APP_ROUTES.library, label: t("nav.library") },
    { to: APP_ROUTES.updates, label: t("nav.updates") },
    { to: APP_ROUTES.profile, label: username },
  ];

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header className="slifer-header glass-header relative z-40 flex h-[52px] items-stretch">
        <div
          className="flex min-w-0 flex-1 items-center gap-6 px-4"
          data-tauri-drag-region
          onDoubleClick={() => void toggleMaximizeWindow()}
        >
          <nav
            className="flex items-center gap-5"
            aria-label="Primary"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <NavLink
              to={APP_ROUTES.library}
              className="shrink-0"
              title="Slifer"
              aria-label="Slifer home"
            >
              <SliferMark className="size-8 drop-shadow-[0_0_12px_rgba(225,29,46,0.45)]" />
            </NavLink>
            {topNav.map((item) => {
              const active = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative max-w-[10rem] truncate pb-0.5 text-[13px] font-semibold tracking-[0.16em] transition-colors",
                    active ? "text-ivory" : "text-muted hover:text-ivory",
                  )}
                >
                  {item.label}
                  {active ? (
                    <span className="absolute inset-x-0 -bottom-2 h-[2px] rounded-full bg-accent" />
                  ) : null}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div
          className="relative z-50 flex items-center gap-1 pr-1"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.updates)}
            className="relative grid size-9 place-items-center text-muted hover:text-ivory"
            title={t("nav.notifications")}
            aria-label={t("nav.notifications")}
          >
            <Bell className="size-4" />
            {unread > 0 ? (
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              void openFriendsWindow();
            }}
            className="grid size-9 place-items-center text-muted hover:text-ivory"
            title={t("nav.friends")}
            aria-label={t("nav.friends")}
          >
            <MessageCircle className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate(`${APP_ROUTES.updates}#client`)}
            className="grid size-9 place-items-center text-muted hover:text-ivory"
            title={t("nav.announcements")}
            aria-label={t("nav.announcements")}
          >
            <Megaphone className="size-4" />
          </button>

          <button
            ref={profileButtonRef}
            type="button"
            onClick={() => {
              setMenuOpen((current) => !current);
            }}
            className="mr-1 flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-hover"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <div className="size-7 overflow-hidden rounded-lg bg-chip">
              <MediaAsset
                src={avatarPath}
                alt={username}
                cacheKey={assetRevision}
                focus={avatarFocus}
                fallback={
                  <span className="grid size-full place-items-center text-[10px] font-semibold text-accent">
                    {initialsFromName(username)}
                  </span>
                }
              />
            </div>
            <span className="max-w-28 truncate text-[13px] text-ivory">{username}</span>
            <ChevronDown className="size-3.5 text-muted" />
          </button>
          <ProfileMenu
            open={menuOpen}
            username={username}
            anchorRef={profileButtonRef}
            onClose={() => setMenuOpen(false)}
          />
        </div>
        <WindowControls />
      </header>
    </>
  );
}
