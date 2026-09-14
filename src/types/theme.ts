export type ThemePresetId = "slifer" | "obsidian" | "void" | "ember" | "aurora" | "custom";

export interface ThemeVars {
  presetId: ThemePresetId;
  accent: string;
  accentGlow: string;
  gold: string;
  ivory: string;
  void: string;
  glassOpacity: number;
  glassBlur: number;
}

export interface ThemePreset {
  id: Exclude<ThemePresetId, "custom">;
  name: string;
  description: string;
  vars: Omit<ThemeVars, "presetId">;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "slifer",
    name: "Liquid Glass",
    description: "Crimson and gold over frosted void",
    vars: {
      accent: "#e11d2e",
      accentGlow: "#ff3b4e",
      gold: "#e8c36a",
      ivory: "#f6f1ea",
      void: "#07060a",
      glassOpacity: 0.28,
      glassBlur: 42,
    },
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Charcoal glass with cool silver",
    vars: {
      accent: "#94a3b8",
      accentGlow: "#cbd5e1",
      gold: "#e2e8f0",
      ivory: "#f1f5f9",
      void: "#0a0c10",
      glassOpacity: 0.32,
      glassBlur: 36,
    },
  },
  {
    id: "void",
    name: "Void",
    description: "Deep ink with soft amethyst",
    vars: {
      accent: "#8b5cf6",
      accentGlow: "#a78bfa",
      gold: "#c4b5fd",
      ivory: "#f3e8ff",
      void: "#08060f",
      glassOpacity: 0.34,
      glassBlur: 40,
    },
  },
  {
    id: "ember",
    name: "Ember",
    description: "Warm amber firelight",
    vars: {
      accent: "#ea580c",
      accentGlow: "#fb923c",
      gold: "#fbbf24",
      ivory: "#fff7ed",
      void: "#0c0806",
      glassOpacity: 0.3,
      glassBlur: 34,
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Teal ice and cyan bloom",
    vars: {
      accent: "#0d9488",
      accentGlow: "#2dd4bf",
      gold: "#67e8f9",
      ivory: "#ecfeff",
      void: "#061014",
      glassOpacity: 0.3,
      glassBlur: 38,
    },
  },
];

export const DEFAULT_THEME: ThemeVars = {
  presetId: "slifer",
  ...THEME_PRESETS[0].vars,
};

export function presetToTheme(preset: ThemePreset): ThemeVars {
  return { presetId: preset.id, ...preset.vars };
}
