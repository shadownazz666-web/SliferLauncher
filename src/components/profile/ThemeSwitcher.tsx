import { useRef, useState } from "react";
import { ChevronDown, Download, Upload } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";
import { THEME_PRESETS } from "@/types/theme";
import { cn } from "@/lib/cn";

export function ThemeSwitcher() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const presetId = useThemeStore((state) => state.presetId);
  const accent = useThemeStore((state) => state.accent);
  const accentGlow = useThemeStore((state) => state.accentGlow);
  const gold = useThemeStore((state) => state.gold);
  const glassOpacity = useThemeStore((state) => state.glassOpacity);
  const glassBlur = useThemeStore((state) => state.glassBlur);
  const applyPreset = useThemeStore((state) => state.applyPreset);
  const setAccent = useThemeStore((state) => state.setAccent);
  const setAccentGlow = useThemeStore((state) => state.setAccentGlow);
  const setGold = useThemeStore((state) => state.setGold);
  const setGlassOpacity = useThemeStore((state) => state.setGlassOpacity);
  const setGlassBlur = useThemeStore((state) => state.setGlassBlur);
  const importTheme = useThemeStore((state) => state.importTheme);
  const exportTheme = useThemeStore((state) => state.exportTheme);

  function downloadTheme(): void {
    const blob = new Blob([JSON.stringify(exportTheme(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "slifer-theme.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File | undefined): Promise<void> {
    if (!file) {
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      importTheme(parsed);
    } catch {
      // Invalid theme files are ignored; the current theme stays applied.
    }
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  return (
    <section className="glass-card space-y-3 rounded-2xl px-3.5 py-3">
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
          aria-expanded={open}
        >
          <ChevronDown
            className={cn(
              "mt-0.5 size-4 shrink-0 text-muted transition-transform",
              !open && "-rotate-90",
            )}
          />
          <span>
            <span className="block text-[13px] font-semibold text-accent">Theme Customization</span>
            <span className="mt-0.5 block text-[12px] text-muted">
              Accents and glass applied across the launcher.
            </span>
          </span>
        </button>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex size-8 items-center justify-center rounded-sm text-muted hover:bg-hover hover:text-white"
            title="Import theme JSON"
          >
            <Upload className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={downloadTheme}
            className="inline-flex size-8 items-center justify-center rounded-sm text-muted hover:bg-hover hover:text-white"
            title="Export theme JSON"
          >
            <Download className="size-3.5" />
          </button>
        </div>
      </div>

      {open ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={cn(
                  "rounded-sm border px-3 py-2.5 text-left transition-colors",
                  presetId === preset.id
                    ? "border-accent bg-transparent"
                    : "border-line bg-inset hover:border-accent/50",
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ background: preset.vars.accent }}
                  />
                  <span className="text-[13px] font-medium text-ivory">{preset.name}</span>
                </span>
                <span className="mt-1 block text-[12px] text-muted">{preset.description}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <ColorField label="Accent" value={accent} onChange={setAccent} />
            <ColorField label="Accent glow" value={accentGlow} onChange={setAccentGlow} />
            <ColorField label="Gold" value={gold} onChange={setGold} />
          </div>

          <SliderField
            label="Glass opacity"
            value={glassOpacity}
            min={0.12}
            max={0.85}
            step={0.01}
            display={`${Math.round(glassOpacity * 100)}%`}
            onChange={setGlassOpacity}
          />
          <SliderField
            label="Glass blur"
            value={glassBlur}
            min={4}
            max={64}
            step={1}
            display={`${Math.round(glassBlur)}px`}
            onChange={setGlassBlur}
          />
        </>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => void handleImport(event.target.files?.[0])}
      />
    </section>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-[0.12em] text-muted">{label.toUpperCase()}</span>
      <span className="mt-1.5 flex items-center gap-2 rounded-sm border border-line bg-inset px-2 py-1.5">
        <input
          type="color"
          value={normalizeHex(value)}
          onChange={(event) => onChange(event.target.value)}
          className="size-8 cursor-pointer rounded-lg border-0 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          className="w-full bg-transparent text-[13px] text-ivory outline-none"
        />
      </span>
    </label>
  );
}

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: SliderFieldProps) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[11px] tracking-[0.12em] text-muted">
        {label.toUpperCase()}
        <span className="tracking-normal text-ivory">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-accent"
      />
    </label>
  );
}

function normalizeHex(value: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#e11d2e";
}
