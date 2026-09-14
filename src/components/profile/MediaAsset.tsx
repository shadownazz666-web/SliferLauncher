import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { toAssetUrl } from "@/lib/assetUrl";
import { isVideoAsset } from "@/lib/mediaKind";
import { cn } from "@/lib/cn";
import { focusCss, type AssetFocus } from "@/types/profile";

interface MediaAssetProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  fallback?: ReactNode;
  cacheKey?: string | number | null;
  focus?: AssetFocus | null;
}

export function MediaAsset({
  src,
  alt = "",
  className,
  style,
  fallback = null,
  cacheKey = null,
  focus = null,
}: MediaAssetProps) {
  const [failed, setFailed] = useState(false);
  const url = toAssetUrl(src, cacheKey);
  const position = focusCss(focus);

  useEffect(() => {
    setFailed(false);
  }, [src, cacheKey, position]);

  if (!url || failed) {
    return <>{fallback}</>;
  }

  const mediaStyle: CSSProperties = {
    ...style,
    objectPosition: position,
  };

  if (isVideoAsset(src)) {
    return (
      <video
        key={url}
        src={url}
        className={cn("h-full w-full object-cover", className)}
        style={mediaStyle}
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <img
      key={url}
      src={url}
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
      style={mediaStyle}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
