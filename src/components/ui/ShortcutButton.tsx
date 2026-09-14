import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface ShortcutButtonProps {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  busy?: boolean;
  disabled?: boolean;
}

export function ShortcutButton({
  label,
  icon: Icon,
  onClick,
  busy = false,
  disabled = false,
}: ShortcutButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled || busy}
      className={cn(
        "glass-panel inline-flex size-10 items-center justify-center rounded-2xl text-ivory/75",
        "transition-colors hover:text-ivory disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <Icon className={cn("size-4", busy && "animate-spin")} />
    </button>
  );
}
