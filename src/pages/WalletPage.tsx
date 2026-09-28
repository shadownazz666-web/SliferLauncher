import { useEffect } from "react";
import { Wallet } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { SliferCoin } from "@/components/wallet/SliferCoin";
import { formatCoins } from "@/lib/sliferCoins";
import { cn } from "@/lib/cn";
import { useWalletStore } from "@/stores/walletStore";

export function WalletPage() {
  const balance = useWalletStore((state) => state.balance);
  const transactions = useWalletStore((state) => state.transactions);
  const hydrate = useWalletStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col gap-4 p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ivory/40">Account</p>
        <h2 className="mt-1 text-2xl font-semibold">Wallet</h2>
      </div>

      <GlassPanel className="relative overflow-hidden px-6 py-8">
        <div className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-gold/15 blur-3xl" />
        <div className="relative flex items-center gap-5">
          <div className="grid size-16 place-items-center rounded-2xl border border-gold/35 bg-gold/10 text-gold">
            <Wallet className="size-8" />
          </div>
          <div>
            <p className="text-[12px] tracking-[0.16em] text-muted uppercase">
              Available balance
            </p>
            <p className="mt-1 flex items-center gap-2.5 text-4xl font-semibold tracking-tight text-ivory">
              <SliferCoin size="md" />
              <span className="tabular-nums">{formatCoins(balance)}</span>
            </p>
            <p className="mt-2 text-[13px] text-muted">
              Earn slowly by launching games and using Slifer. Spend Slifer Coins in the Cosmetic
              Store when cosmetics unlock.
            </p>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="space-y-3 px-5 py-4">
        <p className="text-sm font-medium">Recent activity</p>
        {transactions.length === 0 ? (
          <p className="text-sm text-ivory/50">
            No coin activity yet. Launch a game from Slifer or keep the client open to start
            earning.
          </p>
        ) : (
          <ul className="space-y-2">
            {transactions.slice(0, 24).map((tx) => (
              <li
                key={tx.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/6 bg-black/20 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-ivory">
                    {tx.kind === "spend"
                      ? tx.productName
                        ? `Spent on ${tx.productName}`
                        : tx.label
                      : tx.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {new Date(tx.at).toLocaleString()}
                  </p>
                </div>
                <p
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 text-[13px] font-semibold tabular-nums",
                    tx.kind === "earn" ? "text-gold" : "text-accent",
                  )}
                >
                  <SliferCoin size="sm" />
                  <span>
                    {tx.kind === "earn" ? "+" : "−"}
                    {formatCoins(tx.amount)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>

      <GlassPanel className="space-y-1.5 px-5 py-4">
        <p className="text-sm font-medium">How to earn</p>
        <p className="text-[12px] leading-5 text-muted">
          +5.00 SC when you launch a game through Slifer (up to 3 times per day). +1.00 SC every
          20 minutes while Slifer stays open (up to 6 per day). Longer play sessions can grant a
          little more when you quit — still capped daily so the Cosmetic Store stays meaningful.
        </p>
      </GlassPanel>
    </div>
  );
}
