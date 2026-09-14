import { NavLink } from "react-router-dom";
import { BookOpen, RefreshCcw, Settings, UserRound } from "lucide-react";
import { SliferMark } from "@/components/brand/SliferMark";
import { UserAvatarPill } from "@/components/layout/UserAvatarPill";
import { APP_ROUTES, type NavItem } from "@/types/navigation";
import { cn } from "@/lib/cn";
import { selectUnreadCount, useUpdatesStore } from "@/stores/updatesStore";

const NAV_ITEMS: Array<NavItem & { icon: typeof BookOpen }> = [
  {
    to: APP_ROUTES.library,
    label: "Library",
    description: "Installed and scanned games",
    icon: BookOpen,
  },
  {
    to: APP_ROUTES.updates,
    label: "Updates",
    description: "Patch notes and news",
    icon: RefreshCcw,
  },
  {
    to: APP_ROUTES.profile,
    label: "Profile",
    description: "Identity and play stats",
    icon: UserRound,
  },
  {
    to: APP_ROUTES.settings,
    label: "Settings",
    description: "Launcher preferences",
    icon: Settings,
  },
];

export function Sidebar() {
  const unreadCount = useUpdatesStore(selectUnreadCount);

  return (
    <aside className="glass-sidebar flex h-full flex-col px-4 pb-4 pt-3">
      <div
        className="mb-6 flex items-center gap-3 px-1"
        data-tauri-drag-region
      >
        <SliferMark className="size-10 shrink-0 drop-shadow-[0_0_16px_rgba(225,29,46,0.45)]" />
        <div data-tauri-drag-region>
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80">Sky Dragon</p>
          <h1 className="text-[17px] font-semibold leading-tight">Slifer</h1>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5" aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.description}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-crimson/18 text-ivory shadow-[inset_0_0_0_1px_rgba(225,29,46,0.35)]"
                    : "text-ivory/65 hover:bg-white/6 hover:text-ivory",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      "size-4",
                      isActive ? "text-crimson-glow" : "text-ivory/50 group-hover:text-ivory",
                    )}
                  />
                  <span>{item.label}</span>
                  {item.to === APP_ROUTES.updates && unreadCount > 0 ? (
                    <span className="ml-auto rounded-full bg-crimson/80 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-ivory">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <UserAvatarPill />
    </aside>
  );
}
