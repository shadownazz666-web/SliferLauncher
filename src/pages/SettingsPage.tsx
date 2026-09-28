import { useEffect, useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { getMetadataConfig, setMetadataConfig } from "@/services/metadata";
import { setBrowsingPresence } from "@/services/discord";
import {
  getItadConfig,
  setItadConfig,
  syncItadConfigToNative,
} from "@/services/itad";
import { useDiscordStore } from "@/stores/discordStore";
import { useItadAuthStore } from "@/stores/itadAuthStore";
import { useSetupStore } from "@/stores/setupStore";
import { useUiStore } from "@/stores/uiStore";

export function SettingsPage() {
  const liquidGlassEnabled = useUiStore((state) => state.liquidGlassEnabled);
  const setLiquidGlassEnabled = useUiStore((state) => state.setLiquidGlassEnabled);
  const scanOnLaunch = useUiStore((state) => state.scanOnLaunch);
  const setScanOnLaunch = useUiStore((state) => state.setScanOnLaunch);
  const gameBoosterEnabled = useUiStore((state) => state.gameBoosterEnabled);
  const setGameBoosterEnabled = useUiStore((state) => state.setGameBoosterEnabled);
  const couchMode = useUiStore((state) => state.couchMode);
  const setCouchMode = useUiStore((state) => state.setCouchMode);
  const virtualMouse = useUiStore((state) => state.virtualMouse);
  const setVirtualMouse = useUiStore((state) => state.setVirtualMouse);
  const flashToast = useUiStore((state) => state.flashToast);
  const discordEnabled = useDiscordStore((state) => state.enabled);
  const setDiscordEnabled = useDiscordStore((state) => state.setEnabled);
  const discordClientId = useDiscordStore((state) => state.clientId);
  const setDiscordClientId = useDiscordStore((state) => state.setClientId);
  const applyDiscord = useDiscordStore((state) => state.apply);
  const resetSetup = useSetupStore((state) => state.resetSetup);
  const [apiConfig, setApiConfig] = useState(getMetadataConfig);
  const [itadConfig, setItadLocal] = useState(getItadConfig);
  const [resetting, setResetting] = useState(false);
  const [savingItad, setSavingItad] = useState(false);

  const itadConnected = useItadAuthStore((state) => state.connected);
  const itadUsername = useItadAuthStore((state) => state.username);
  const itadConnecting = useItadAuthStore((state) => state.connecting);
  const connectItad = useItadAuthStore((state) => state.connect);
  const disconnectItad = useItadAuthStore((state) => state.disconnect);
  const hydrateItad = useItadAuthStore((state) => state.hydrate);

  useEffect(() => {
    void hydrateItad();
  }, [hydrateItad]);

  function updateItad(partial: Parameters<typeof setItadConfig>[0]) {
    setItadLocal(setItadConfig(partial));
  }

  async function saveItadCredentials() {
    setSavingItad(true);
    try {
      await syncItadConfigToNative();
      flashToast("IsThereAnyDeal credentials saved");
    } catch (error) {
      flashToast(error instanceof Error ? error.message : "Could not save ITAD config");
    } finally {
      setSavingItad(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ivory/40">Preferences</p>
        <h2 className="mt-1 text-2xl font-semibold">Settings</h2>
      </div>

      <GlassPanel className="divide-y divide-white/8">
        <SettingsRow
          title="Liquid Glass backdrop"
          description="Use native Mica/Acrylic when available, with a CSS glass overlay as fallback."
          checked={liquidGlassEnabled}
          onChange={setLiquidGlassEnabled}
        />
        <SettingsRow
          title="Scan on launch"
          description="Automatically inspect known library folders when the launcher starts."
          checked={scanOnLaunch}
          onChange={setScanOnLaunch}
        />
        <SettingsRow
          title="Game Booster"
          description="When a game launches, suspend common browsers, lower Slifer priority, and minimize the window. Restores when the game exits."
          checked={gameBoosterEnabled}
          onChange={setGameBoosterEnabled}
        />
        <SettingsRow
          title="Couch mode"
          description="Gamepad-first library browsing. D-pad selects games, A launches, B exits, Guide shows/hides Slifer."
          checked={couchMode}
          onChange={setCouchMode}
        />
        <SettingsRow
          title="Virtual mouse"
          description="Right stick moves an on-screen cursor; right trigger clicks. Also active automatically in Couch mode."
          checked={virtualMouse}
          onChange={setVirtualMouse}
        />
        <SettingsRow
          title="Discord Rich Presence"
          description="Show idle browsing or the current game, elapsed time, and artwork on Discord."
          checked={discordEnabled}
          onChange={setDiscordEnabled}
        />
      </GlassPanel>

      <GlassPanel className="space-y-3 px-5 py-4">
        <p className="text-sm font-medium">In-game overlay</p>
        <p className="text-sm leading-6 text-ivory/50">
          While a game launched from Slifer is running, press{" "}
          <kbd className="rounded bg-black/30 px-1.5 py-0.5 text-ivory/80">Shift</kbd> +{" "}
          <kbd className="rounded bg-black/30 px-1.5 py-0.5 text-ivory/80">Tab</kbd> to open the
          Slifer overlay (friends, session info). Press again or Esc to return to the game.
        </p>
      </GlassPanel>

      <GlassPanel className="space-y-3 px-5 py-4">
        <p className="text-sm font-medium">Media capture</p>
        <p className="text-sm leading-6 text-ivory/50">
          Press <kbd className="rounded bg-black/30 px-1.5 py-0.5 text-ivory/80">F11</kbd> while a
          game is selected to save a full-screen capture under{" "}
          <code className="text-ivory/70">%APPDATA%/SliferLauncher/Media/&#123;gameId&#125;/</code>.
          Open Media from the game page sidebar to browse stills and clips.
        </p>
      </GlassPanel>

      <GlassPanel className="space-y-4 px-5 py-4">
        <div>
          <p className="text-sm font-medium">Discord application</p>
          <p className="mt-1 text-sm leading-6 text-ivory/50">
            Status that sticks comes from Rich Presence, not Discord → Activity → Registered Games.
            Create an app at{" "}
            <code className="text-ivory/70">discord.com/developers/applications</code>, name it
            something like <code className="text-ivory/70">Slifer</code>, enable Rich Presence, and
            upload an Art Asset named <code className="text-ivory/70">slifer</code>. Paste the
            Application ID below and turn on Discord Rich Presence above.
          </p>
          <p className="mt-2 text-sm leading-6 text-ivory/50">
            Selecting Slifer Launcher under Registered Games always moves it to Added Games — that
            is Discord&apos;s UI. Leave it deleted (or turn the monitor icon off). Registered Games
            fights Rich Presence and will not keep a custom launcher as Current Game the way
            verified titles do.
          </p>
        </div>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.16em] text-ivory/40">
            Discord application ID
          </span>
          <input
            type="text"
            value={discordClientId}
            onChange={(event) => setDiscordClientId(event.target.value)}
            placeholder="123456789012345678"
            autoComplete="off"
            className="mt-2 h-10 w-full rounded-2xl border border-white/8 bg-black/20 px-3 text-sm outline-none focus:border-crimson/50"
          />
        </label>
        <button
          type="button"
          disabled={!discordEnabled || !discordClientId.trim()}
          onClick={() => {
            void (async () => {
              await applyDiscord();
              await setBrowsingPresence("settings");
              flashToast("Discord presence pushed — check your Discord profile.");
            })();
          }}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-ivory transition hover:bg-white/10 disabled:opacity-40"
        >
          Push presence now
        </button>
      </GlassPanel>

      <GlassPanel className="space-y-4 px-5 py-4">
        <div>
          <p className="text-sm font-medium">Artwork APIs</p>
          <p className="mt-1 text-sm leading-6 text-ivory/50">
            Covers and banners download automatically from Steam CDN. SteamGridDB and IGDB are
            optional upgrades.
          </p>
        </div>
        <SecretField
          label="SteamGridDB API key"
          value={apiConfig.steamGridDbKey}
          onChange={(steamGridDbKey) =>
            setApiConfig(setMetadataConfig({ steamGridDbKey }))
          }
        />
        <SecretField
          label="IGDB client ID"
          value={apiConfig.igdbClientId}
          onChange={(igdbClientId) => setApiConfig(setMetadataConfig({ igdbClientId }))}
        />
        <SecretField
          label="IGDB client secret"
          value={apiConfig.igdbClientSecret}
          onChange={(igdbClientSecret) =>
            setApiConfig(setMetadataConfig({ igdbClientSecret }))
          }
        />
      </GlassPanel>

      <GlassPanel className="space-y-4 px-5 py-4">
        <div>
          <p className="text-sm font-medium">IsThereAnyDeal</p>
          <p className="mt-1 text-sm leading-6 text-ivory/50">
            Powers the Store deals, search, and price overview. Credentials stay on this machine
            (%APPDATA%/SliferLauncher) and are never bundled with the app. Register an app at{" "}
            <code className="text-ivory/70">isthereanydeal.com</code> with redirect{" "}
            <code className="text-ivory/70">mylauncher://auth</code>.
          </p>
        </div>
        <SecretField
          label="API key"
          value={itadConfig.apiKey}
          onChange={(apiKey) => updateItad({ apiKey })}
        />
        <SecretField
          label="OAuth client ID"
          value={itadConfig.clientId}
          onChange={(clientId) => updateItad({ clientId })}
        />
        <SecretField
          label="OAuth client secret (optional for public clients)"
          value={itadConfig.clientSecret}
          onChange={(clientSecret) => updateItad({ clientSecret })}
        />
        <label className="block">
          <span className="text-xs uppercase tracking-[0.16em] text-ivory/40">Country</span>
          <input
            type="text"
            value={itadConfig.country}
            maxLength={2}
            onChange={(event) => updateItad({ country: event.target.value })}
            placeholder="US"
            autoComplete="off"
            className="mt-2 h-10 w-full rounded-2xl border border-white/8 bg-black/20 px-3 text-sm uppercase outline-none focus:border-crimson/50"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={savingItad}
            onClick={() => void saveItadCredentials()}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-ivory transition hover:bg-white/10 disabled:opacity-40"
          >
            {savingItad ? "Saving…" : "Save credentials"}
          </button>
          {itadConnected ? (
            <button
              type="button"
              onClick={() => void disconnectItad()}
              className="rounded-2xl border border-line px-4 py-2 text-sm text-ivory hover:bg-hover"
            >
              Disconnect{itadUsername ? ` (${itadUsername})` : ""}
            </button>
          ) : (
            <button
              type="button"
              disabled={itadConnecting || !itadConfig.clientId.trim()}
              onClick={() => void connectItad()}
              className="rounded-2xl border border-accent/40 bg-accent/15 px-4 py-2 text-sm text-accent hover:bg-accent/25 disabled:opacity-40"
            >
              {itadConnecting ? "Opening browser…" : "Connect ITAD account"}
            </button>
          )}
        </div>
      </GlassPanel>

      <GlassPanel className="space-y-3 px-5 py-4">
        <div>
          <p className="text-sm font-medium">Developer</p>
          <p className="mt-1 text-sm leading-6 text-ivory/50">
            Reset first-run setup (language, install path, and local sign-in) to re-test the
            installer wizard without reinstalling.
          </p>
        </div>
        <button
          type="button"
          disabled={resetting}
          onClick={() => {
            setResetting(true);
            void resetSetup().finally(() => setResetting(false));
          }}
          className="h-10 rounded-xl border border-line px-4 text-[13px] text-ivory hover:bg-hover disabled:opacity-60"
        >
          {resetting ? "Resetting…" : "Reset setup wizard"}
        </button>
      </GlassPanel>
    </div>
  );
}

interface SettingsRowProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}

function SettingsRow({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: SettingsRowProps) {
  return (
    <label className="flex items-center justify-between gap-6 px-5 py-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-sm leading-6 text-ivory/50">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        className="size-4 accent-crimson disabled:opacity-40"
      />
    </label>
  );
}

interface SecretFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function SecretField({ label, value, onChange }: SecretFieldProps) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.16em] text-ivory/40">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        className="mt-2 h-10 w-full rounded-2xl border border-white/8 bg-black/20 px-3 text-sm outline-none focus:border-crimson/50"
      />
    </label>
  );
}
