import { useLayoutEffect } from "react";
import { applyThemeToDocument } from "@/lib/theme";
import { useThemeStore } from "@/stores/themeStore";

export function useThemeEngine(): void {
  const presetId = useThemeStore((state) => state.presetId);
  const accent = useThemeStore((state) => state.accent);
  const accentGlow = useThemeStore((state) => state.accentGlow);
  const gold = useThemeStore((state) => state.gold);
  const ivory = useThemeStore((state) => state.ivory);
  const canvas = useThemeStore((state) => state.void);
  const glassOpacity = useThemeStore((state) => state.glassOpacity);
  const glassBlur = useThemeStore((state) => state.glassBlur);

  useLayoutEffect(() => {
    applyThemeToDocument({
      presetId,
      accent,
      accentGlow,
      gold,
      ivory,
      void: canvas,
      glassOpacity,
      glassBlur,
    });
  }, [accent, accentGlow, canvas, glassBlur, glassOpacity, gold, ivory, presetId]);
}
