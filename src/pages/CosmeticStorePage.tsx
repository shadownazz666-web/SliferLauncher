import { Store } from "lucide-react";
import { SliferCoin } from "@/components/wallet/SliferCoin";
import { formatCoins } from "@/lib/sliferCoins";

const PREVIEWS = [
  {
    title: "Profile borders",
    blurb: "Frame your avatar with seasonal and rarity borders.",
    price: 250,
  },
  {
    title: "Username fonts",
    blurb: "Swap the typeface used for your persona name.",
    price: 180,
  },
  {
    title: "Name animations",
    blurb: "Idle shimmer, glow, and motion styles for usernames.",
    price: 320,
  },
  {
    title: "More cosmetics",
    blurb: "Extra flair for profiles and the friends list.",
    price: 150,
  },
] as const;

export function CosmeticStorePage() {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 px-1 py-2">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ivory/40">Coming soon</p>
        <h2 className="mt-1 text-2xl font-semibold text-ivory">Cosmetic Store</h2>
        <p className="mt-2 max-w-xl text-[13px] leading-5 text-muted">
          Spend Slifer Coins on profile cosmetics and extras — borders, username fonts, name
          animations, and more. Checkout arrives with the first catalog drop.
        </p>
      </div>

      <div className="glass-card grid gap-3 rounded-2xl p-4 sm:grid-cols-2">
        {PREVIEWS.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-dashed border-line bg-inset/60 px-3.5 py-3"
          >
            <div className="mb-2 flex items-center gap-2 text-accent">
              <Store className="size-4" />
              <p className="text-[13px] font-medium text-ivory">{item.title}</p>
            </div>
            <p className="text-[12px] leading-5 text-muted">{item.blurb}</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold tabular-nums text-gold">
                <SliferCoin size="sm" />
                {formatCoins(item.price)}
              </p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted/70">Soon</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
