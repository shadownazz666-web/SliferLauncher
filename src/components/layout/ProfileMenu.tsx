import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { APP_ROUTES } from "@/types/navigation";
import { useUiStore } from "@/stores/uiStore";

interface ProfileMenuProps {
  open: boolean;
  username: string;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export function ProfileMenu({ open, username, onClose, anchorRef }: ProfileMenuProps) {
  const navigate = useNavigate();
  const flashToast = useUiStore((state) => state.flashToast);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) {
        return;
      }
      if (anchorRef?.current?.contains(target)) {
        return;
      }
      onClose();
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchorRef, onClose, open]);

  function go(path: string): void {
    navigate(path);
    onClose();
  }

  const rect = anchorRef?.current?.getBoundingClientRect();
  const top = rect ? rect.bottom + 6 : 56;
  const right = rect ? Math.max(8, window.innerWidth - rect.right) : 12;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          style={{ top, right }}
          className="glass-menu fixed z-[300] w-64 overflow-hidden rounded-xl py-1.5"
          role="menu"
        >
          <MenuItem onClick={() => go(APP_ROUTES.profile)}>View My Profile</MenuItem>
          <MenuItem onClick={() => go(APP_ROUTES.settings)}>
            Account Details: {username}
          </MenuItem>
          <MenuItem onClick={() => go(APP_ROUTES.settings)}>Launcher Settings</MenuItem>
          <MenuItem onClick={() => go(APP_ROUTES.wallet)}>View My Wallet</MenuItem>
          <div className="my-1 h-px bg-line" />
          <MenuItem
            onClick={() => {
              flashToast("Offline mode — this machine is the current account.");
              onClose();
            }}
          >
            Change Account...
          </MenuItem>
          <MenuItem
            onClick={() => {
              flashToast("Sign out is unavailable in offline launcher mode.");
              onClose();
            }}
          >
            Sign Out of Account...
          </MenuItem>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function MenuItem({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="block w-full px-3.5 py-1.5 text-left text-[13px] text-ivory hover:bg-hover hover:text-white"
    >
      {children}
    </button>
  );
}
