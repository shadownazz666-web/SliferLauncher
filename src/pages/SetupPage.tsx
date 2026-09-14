import { useEffect, useState } from "react";
import { FolderOpen, Languages, LogIn, UserPlus } from "lucide-react";
import { SliferMark } from "@/components/brand/SliferMark";
import { WindowControls } from "@/components/layout/WindowControls";
import { cn } from "@/lib/cn";
import { invokeErrorMessage } from "@/lib/invokeError";
import { toggleMaximizeWindow } from "@/lib/window";
import { useSetupStore } from "@/stores/setupStore";
import { SETUP_LOCALES } from "@/types/setup";

export function SetupPage() {
  const step = useSetupStore((state) => state.step);
  const locale = useSetupStore((state) => state.locale);
  const installPath = useSetupStore((state) => state.installPath);
  const setLocale = useSetupStore((state) => state.setLocale);
  const setInstallPath = useSetupStore((state) => state.setInstallPath);
  const browseInstallPath = useSetupStore((state) => state.browseInstallPath);
  const setStep = useSetupStore((state) => state.setStep);
  const createAccount = useSetupStore((state) => state.createAccount);
  const loginAccount = useSetupStore((state) => state.loginAccount);

  const [selectedLocale, setSelectedLocale] = useState(locale || "en");
  const [pathDraft, setPathDraft] = useState(installPath ?? "");
  const [authMode, setAuthMode] = useState<"create" | "login">("create");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (installPath) {
      setPathDraft(installPath);
    }
  }, [installPath]);

  useEffect(() => {
    if (locale) {
      setSelectedLocale(locale);
    }
  }, [locale]);

  async function continueLanguage(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await setLocale(selectedLocale);
    } catch (caught) {
      setError(invokeErrorMessage(caught, "Could not save language"));
    } finally {
      setBusy(false);
    }
  }

  async function continueInstall(): Promise<void> {
    const path = (pathDraft || installPath || "").trim();
    if (!path) {
      setError("Choose an install location");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setInstallPath(path);
    } catch (caught) {
      setError(invokeErrorMessage(caught, "Could not save path"));
    } finally {
      setBusy(false);
    }
  }

  async function submitAuth(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      if (authMode === "create") {
        await createAccount(username, password);
      } else {
        await loginAccount(username, password);
      }
    } catch (caught) {
      setError(invokeErrorMessage(caught, "Authentication failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-frame slifer-frame has-glass flex h-full flex-col">
      <header className="glass-header relative z-40 flex h-[44px] shrink-0 items-stretch">
        <div
          className="flex min-w-0 flex-1 items-center gap-3 px-4"
          data-tauri-drag-region
          onDoubleClick={() => void toggleMaximizeWindow()}
        >
          <SliferMark className="size-6 shrink-0" />
          <p
            className="truncate text-[12px] font-semibold tracking-[0.14em] text-ivory/80 uppercase"
            data-tauri-drag-region
          >
            Slifer Setup
          </p>
        </div>
        <div onMouseDown={(event) => event.stopPropagation()}>
          <WindowControls />
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-6">
        <div
          className="glass-card w-full max-w-lg rounded-2xl px-6 py-7"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="mb-6 flex items-center gap-3">
            <SliferMark className="size-11 shrink-0" />
            <div>
              <p className="text-[11px] tracking-[0.18em] text-gold/80 uppercase">Slifer</p>
              <h1 className="text-xl font-semibold text-ivory">Setup</h1>
            </div>
          </div>

          <StepRail current={step} />

          {step === "language" ? (
            <section className="mt-5 space-y-4">
              <div className="flex items-center gap-2 text-accent">
                <Languages className="size-4" />
                <h2 className="text-[15px] font-semibold text-ivory">Choose language</h2>
              </div>
              <p className="text-[13px] text-muted">
                This preference applies across Slifer. You can change it later in Edit Profile.
              </p>
              <div className="grid max-h-64 gap-1.5 overflow-y-auto pr-1">
                {SETUP_LOCALES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedLocale(item.id)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left transition-colors",
                      selectedLocale === item.id
                        ? "border-accent bg-inset"
                        : "border-line hover:border-accent/40 hover:bg-hover",
                    )}
                  >
                    <span className="block text-[13px] font-medium text-ivory">{item.native}</span>
                    <span className="text-[11px] text-muted">{item.label}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void continueLanguage()}
                className="h-10 w-full rounded-xl bg-accent text-[13px] font-medium text-white hover:bg-crimson-glow disabled:opacity-60"
              >
                Next
              </button>
            </section>
          ) : null}

          {step === "install" ? (
            <section className="mt-5 space-y-4">
              <div className="flex items-center gap-2 text-accent">
                <FolderOpen className="size-4" />
                <h2 className="text-[15px] font-semibold text-ivory">Install location</h2>
              </div>
              <p className="text-[13px] text-muted">
                Choose where Slifer should live on this PC. The packaged installer also offers this
                step; here it is saved for testing in this environment.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pathDraft || installPath || ""}
                  onChange={(event) => setPathDraft(event.target.value)}
                  spellCheck={false}
                  className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-inset px-3 text-[13px] text-ivory outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() =>
                    void browseInstallPath().then(() => {
                      const next = useSetupStore.getState().installPath;
                      if (next) {
                        setPathDraft(next);
                      }
                    })
                  }
                  className="h-10 shrink-0 rounded-xl border border-line px-3 text-[12px] text-ivory hover:bg-hover"
                >
                  Browse
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("language")}
                  className="h-10 flex-1 rounded-xl border border-line text-[13px] text-muted hover:bg-hover hover:text-ivory"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void continueInstall()}
                  className="h-10 flex-1 rounded-xl bg-accent text-[13px] font-medium text-white hover:bg-crimson-glow disabled:opacity-60"
                >
                  Next
                </button>
              </div>
            </section>
          ) : null}

          {step === "auth" ? (
            <section className="mt-5 space-y-4">
              <div className="flex gap-1 rounded-xl bg-inset p-1">
                <AuthTab
                  active={authMode === "create"}
                  icon={UserPlus}
                  label="Create"
                  onClick={() => setAuthMode("create")}
                />
                <AuthTab
                  active={authMode === "login"}
                  icon={LogIn}
                  label="Login"
                  onClick={() => setAuthMode("login")}
                />
              </div>
              <p className="text-[13px] text-muted">
                Local account only for now — credentials stay on this machine under AppData.
              </p>
              <label className="block">
                <span className="text-[11px] tracking-[0.12em] text-muted">USERNAME</span>
                <input
                  type="text"
                  value={username}
                  maxLength={32}
                  autoComplete="username"
                  onChange={(event) => setUsername(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-line bg-inset px-3 text-[13px] text-ivory outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="text-[11px] tracking-[0.12em] text-muted">PASSWORD</span>
                <input
                  type="password"
                  value={password}
                  autoComplete={authMode === "create" ? "new-password" : "current-password"}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-line bg-inset px-3 text-[13px] text-ivory outline-none focus:border-accent"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("install")}
                  className="h-10 flex-1 rounded-xl border border-line text-[13px] text-muted hover:bg-hover hover:text-ivory"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={busy || !username.trim() || password.length < 6}
                  onClick={() => void submitAuth()}
                  className="h-10 flex-1 rounded-xl bg-accent text-[13px] font-medium text-white hover:bg-crimson-glow disabled:opacity-60"
                >
                  {busy ? "Working…" : authMode === "create" ? "Create account" : "Sign in"}
                </button>
              </div>
            </section>
          ) : null}

          {error ? <p className="mt-4 text-[12px] text-accent">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

function StepRail({ current }: { current: "language" | "install" | "auth" }) {
  const steps = [
    { id: "language", label: "Language" },
    { id: "install", label: "Location" },
    { id: "auth", label: "Account" },
  ] as const;
  const index = steps.findIndex((step) => step.id === current);

  return (
    <ol className="flex items-center gap-2">
      {steps.map((step, stepIndex) => (
        <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
              stepIndex <= index ? "bg-accent text-white" : "bg-inset text-muted",
            )}
          >
            {stepIndex + 1}
          </span>
          <span
            className={cn(
              "truncate text-[11px] tracking-[0.08em] uppercase",
              stepIndex <= index ? "text-ivory" : "text-muted",
            )}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function AuthTab({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof LogIn;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-medium",
        active ? "bg-chip text-ivory" : "text-muted hover:text-ivory",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}
