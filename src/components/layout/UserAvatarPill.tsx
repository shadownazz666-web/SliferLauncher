import { MediaAsset } from "@/components/profile/MediaAsset";
import { useProfileStore } from "@/stores/profileStore";
import { initialsFromName } from "@/types/profile";

export function UserAvatarPill() {
  const username = useProfileStore((state) => state.username);
  const status = useProfileStore((state) => state.status);
  const avatarPath = useProfileStore((state) => state.avatarPath);
  const avatarFocus = useProfileStore((state) => state.avatarFocus);
  const assetRevision = useProfileStore((state) => state.assetRevision);

  return (
    <div className="glass-panel flex items-center gap-3 rounded-2xl px-3 py-2.5">
      <div className="relative size-9">
        <div className="size-9 overflow-hidden rounded-full bg-gradient-to-br from-crimson to-[#7a0d18] text-xs font-semibold">
          <MediaAsset
            src={avatarPath}
            alt={username}
            cacheKey={assetRevision}
            focus={avatarFocus}
            fallback={
              <span className="grid size-full place-items-center">
                {initialsFromName(username)}
              </span>
            }
          />
        </div>
        <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-void bg-emerald-400" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{username}</p>
        <p className="text-[11px] uppercase tracking-[0.16em] text-ivory/40">{status}</p>
      </div>
    </div>
  );
}
