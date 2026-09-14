import { cn } from "@/lib/cn";
import logoUrl from "@/assets/slifer-logo.png";

interface SliferMarkProps {
  className?: string;
  alt?: string;
}

export function SliferMark({ className, alt = "Slifer" }: SliferMarkProps) {
  return (
    <img
      src={logoUrl}
      alt={alt}
      draggable={false}
      className={cn("size-9 rounded-full object-cover", className)}
    />
  );
}
