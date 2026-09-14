import type { ThemeVars } from "@/types/theme";

export function hexToRgb(hex: string): string {
  const raw = hex.replace("#", "").trim();
  const normalized =
    raw.length === 3
      ? raw
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return "225, 29, 46";
  }
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `${red}, ${green}, ${blue}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function applyThemeToDocument(theme: ThemeVars): void {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  root.style.setProperty("--color-crimson", theme.accent);
  root.style.setProperty("--color-crimson-glow", theme.accentGlow);
  root.style.setProperty("--color-gold", theme.gold);
  root.style.setProperty("--color-ivory", theme.ivory);
  root.style.setProperty("--color-void", theme.void);
  root.style.setProperty("--color-accent", theme.accent);
  root.style.setProperty("--accent-rgb", hexToRgb(theme.accent));
  root.style.setProperty("--gold-rgb", hexToRgb(theme.gold));
  root.style.setProperty("--void-rgb", hexToRgb(theme.void));
  root.style.setProperty("--glass-opacity", String(clamp(theme.glassOpacity, 0.12, 0.85)));
  root.style.setProperty("--glass-blur", `${clamp(theme.glassBlur, 4, 64)}px`);
  root.style.setProperty(
    "--glass-sidebar-opacity",
    String(clamp(theme.glassOpacity + 0.12, 0.2, 0.9)),
  );
  root.style.setProperty(
    "--glass-header-opacity",
    String(clamp(theme.glassOpacity - 0.14, 0.1, 0.7)),
  );
}

export function parseImportedTheme(raw: unknown): ThemeVars | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as Partial<ThemeVars>;
  if (typeof value.accent !== "string" || typeof value.gold !== "string") {
    return null;
  }
  return {
    presetId: value.presetId === "custom" ? "custom" : value.presetId ?? "custom",
    accent: value.accent,
    accentGlow: value.accentGlow ?? value.accent,
    gold: value.gold,
    ivory: value.ivory ?? "#f6f1ea",
    void: value.void ?? "#07060a",
    glassOpacity: clamp(Number(value.glassOpacity ?? 0.28), 0.12, 0.85),
    glassBlur: clamp(Number(value.glassBlur ?? 42), 4, 64),
  };
}
