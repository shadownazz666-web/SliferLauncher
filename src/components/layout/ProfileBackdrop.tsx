import { Backdrop } from "@/components/layout/Backdrop";
import { MediaAsset } from "@/components/profile/MediaAsset";
import { useProfileStore } from "@/stores/profileStore";

export function ProfileBackdrop() {
  const backgroundPath = useProfileStore((state) => state.backgroundPath);
  const backgroundFocus = useProfileStore((state) => state.backgroundFocus);
  const assetRevision = useProfileStore((state) => state.assetRevision);

  if (!backgroundPath) {
    return <Backdrop />;
  }

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 scale-105">
        <MediaAsset
          src={backgroundPath}
          alt=""
          cacheKey={assetRevision}
          focus={backgroundFocus}
          style={{ filter: "saturate(1.05)" }}
        />
      </div>
      <div className="absolute inset-0 bg-void/60" />
      <div className="liquid-sheen absolute inset-0" />
    </div>
  );
}
