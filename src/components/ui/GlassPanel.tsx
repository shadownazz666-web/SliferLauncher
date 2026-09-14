import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface GlassPanelProps {
  className?: string;
  children: ReactNode;
}

export function GlassPanel({ className, children }: GlassPanelProps) {
  return <section className={cn("glass-panel rounded-3xl", className)}>{children}</section>;
}
