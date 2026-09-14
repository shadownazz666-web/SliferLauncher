import { cn } from "@/lib/cn";

/** Face texture from the Gold Coin Blank pack (same art as the glTF). */
const COIN_FACE = "/models/gold-coin/coin-preview.png";
/** Slifer Coins monogram stamped on both faces. */
const COIN_LOGO = "/models/gold-coin/sc-logo.png";

interface SliferCoinProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const BOX = {
  sm: "size-5",
  md: "size-10",
  lg: "size-12",
} as const;

function CoinFace({ side }: { side: "front" | "back" }) {
  return (
    <span
      className={cn(
        "slifer-coin-face",
        side === "front" ? "slifer-coin-face--front" : "slifer-coin-face--back",
      )}
      style={{ backgroundImage: `url(${COIN_FACE})` }}
    >
      <img src={COIN_LOGO} alt="" draggable={false} className="slifer-coin-logo" />
    </span>
  );
}

/**
 * Slow-spinning coin using the blank gold coin albedo + centered SC logo.
 * CSS 3D is used instead of WebGL — glTF/WebGL was blanking out in the Tauri WebView.
 */
export function SliferCoin({ className, size = "md" }: SliferCoinProps) {
  return (
    <span
      className={cn("slifer-coin-stage inline-block shrink-0 align-middle", BOX[size], className)}
      aria-hidden
    >
      <span className="slifer-coin-spin">
        <CoinFace side="front" />
        <CoinFace side="back" />
        <span className="slifer-coin-rim" />
      </span>
    </span>
  );
}
