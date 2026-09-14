import { useEffect, useState, type ReactNode } from "react";
import {
  closeWindow,
  minimizeWindow,
  subscribeWindowMaximized,
  toggleMaximizeWindow,
} from "@/lib/window";
import { cn } from "@/lib/cn";

interface WindowControlsProps {
  className?: string;
}

export function WindowControls({ className }: WindowControlsProps) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void subscribeWindowMaximized((next) => {
      if (!disposed) {
        setMaximized(next);
      }
    }).then((unsubscribe) => {
      if (disposed) {
        unsubscribe();
        return;
      }
      unlisten = unsubscribe;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  return (
    <div className={cn("flex h-full items-stretch", className)}>
      <WindowButton label="Minimize" onClick={() => void minimizeWindow()}>
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
          <path d="M2 6h8" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </WindowButton>
      <WindowButton
        label={maximized ? "Restore" : "Maximize"}
        onClick={() => void toggleMaximizeWindow()}
      >
        {maximized ? (
          <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
            <path
              d="M3.5 4.5h5v5h-5zM4.5 3.5h5v5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
            <rect
              x="2.6"
              y="2.6"
              width="6.8"
              height="6.8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        )}
      </WindowButton>
      <WindowButton
        label="Close"
        tone="danger"
        onClick={() => void closeWindow()}
      >
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </WindowButton>
    </div>
  );
}

interface WindowButtonProps {
  label: string;
  tone?: "default" | "danger";
  onClick: () => void;
  children: ReactNode;
}

function WindowButton({
  label,
  tone = "default",
  onClick,
  children,
}: WindowButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex w-12 items-center justify-center text-ivory/75 transition-colors",
        tone === "danger"
          ? "hover:bg-[#e81123] hover:text-white"
          : "hover:bg-white/10 hover:text-ivory",
      )}
    >
      {children}
    </button>
  );
}
