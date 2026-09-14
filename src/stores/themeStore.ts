import { create } from "zustand";
import { applyThemeToDocument, clamp, parseImportedTheme } from "@/lib/theme";
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  presetToTheme,
  type ThemePresetId,
  type ThemeVars,
} from "@/types/theme";

const STORAGE_KEY = "slifer.theme";

function readTheme(): ThemeVars {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_THEME;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Drop the old Steam-clone preset so the launcher keeps its own glass look.
    if (parsed.presetId === "steam") {
      return DEFAULT_THEME;
    }
    const presetId =
      typeof parsed.presetId === "string" ? parsed.presetId : "custom";
    const known = THEME_PRESETS.some((preset) => preset.id === presetId);
    if (presetId !== "custom" && !known) {
      return DEFAULT_THEME;
    }
    return {
      ...DEFAULT_THEME,
      ...(parsed as Partial<ThemeVars>),
      presetId: (known || presetId === "custom"
        ? presetId
        : "custom") as ThemeVars["presetId"],
    };
  } catch {
    return DEFAULT_THEME;
  }
}

function commit(theme: ThemeVars): ThemeVars {
  applyThemeToDocument(theme);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  }
  return theme;
}

interface ThemeState extends ThemeVars {
  applyPreset: (presetId: Exclude<ThemePresetId, "custom">) => void;
  setAccent: (accent: string) => void;
  setAccentGlow: (accentGlow: string) => void;
  setGold: (gold: string) => void;
  setGlassOpacity: (glassOpacity: number) => void;
  setGlassBlur: (glassBlur: number) => void;
  importTheme: (raw: unknown) => boolean;
  exportTheme: () => ThemeVars;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = commit(readTheme());
  return {
    ...initial,
    applyPreset: (presetId) => {
      const preset = THEME_PRESETS.find((item) => item.id === presetId);
      if (!preset) {
        return;
      }
      set(commit(presetToTheme(preset)));
    },
    setAccent: (accent) => set(commit({ ...get(), presetId: "custom", accent })),
    setAccentGlow: (accentGlow) =>
      set(commit({ ...get(), presetId: "custom", accentGlow })),
    setGold: (gold) => set(commit({ ...get(), presetId: "custom", gold })),
    setGlassOpacity: (glassOpacity) =>
      set(
        commit({
          ...get(),
          presetId: "custom",
          glassOpacity: clamp(glassOpacity, 0.12, 0.85),
        }),
      ),
    setGlassBlur: (glassBlur) =>
      set(
        commit({
          ...get(),
          presetId: "custom",
          glassBlur: clamp(glassBlur, 4, 64),
        }),
      ),
    importTheme: (raw) => {
      const theme = parseImportedTheme(raw);
      if (!theme) {
        return false;
      }
      set(commit({ ...theme, presetId: "custom" }));
      return true;
    },
    exportTheme: () => {
      const state = get();
      return {
        presetId: state.presetId,
        accent: state.accent,
        accentGlow: state.accentGlow,
        gold: state.gold,
        ivory: state.ivory,
        void: state.void,
        glassOpacity: state.glassOpacity,
        glassBlur: state.glassBlur,
      };
    },
  };
});
