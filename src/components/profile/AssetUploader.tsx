import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Trash2, X } from "lucide-react";
import { MediaAsset } from "@/components/profile/MediaAsset";
import { PROFILE_ASSET_ACCEPT, isVideoAsset } from "@/lib/mediaKind";
import { cn } from "@/lib/cn";
import { useProfileStore } from "@/stores/profileStore";
import type { ProfileAssetSlot } from "@/types/profile";

interface AssetUploaderProps {
  slot: ProfileAssetSlot;
  label: string;
  hint: string;
  currentPath: string | null;
  onImport: (slot: ProfileAssetSlot, file: File) => Promise<void>;
  onClear: (slot: ProfileAssetSlot) => Promise<void>;
  compact?: boolean;
}

interface DraftState {
  file: File;
  previewUrl: string;
}

export function AssetUploader({
  slot,
  label,
  hint,
  currentPath,
  onImport,
  onClear,
  compact = false,
}: AssetUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const assetRevision = useProfileStore((state) => state.assetRevision);

  useEffect(() => {
    return () => {
      if (draft?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(draft.previewUrl);
      }
    };
  }, [draft?.previewUrl]);

  function clearDraft(): void {
    setDraft((current) => {
      if (current?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return null;
    });
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) {
      return;
    }
    setError(null);
    setDraft((current) => {
      if (current?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return {
        file,
        previewUrl: URL.createObjectURL(file),
      };
    });
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function saveDraft(): Promise<void> {
    if (!draft) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onImport(slot, draft.file);
      clearDraft();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const editing = draft != null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-ivory">{label}</p>
          <p className="text-[12px] text-muted">{hint}</p>
        </div>
        {currentPath && !editing ? (
          <button
            type="button"
            onClick={() => void onClear(slot)}
            className="rounded-sm p-1.5 text-muted transition-colors hover:bg-hover hover:text-white"
            title={`Remove ${label.toLowerCase()}`}
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-xl border bg-inset",
          editing ? "border-accent" : "border-dashed border-line",
          compact ? "h-28" : "h-40",
        )}
      >
        {draft ? (
          isVideoAsset(draft.file.name) ? (
            <video
              src={draft.previewUrl}
              className="h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img
              src={draft.previewUrl}
              alt={label}
              className="h-full w-full object-cover"
              draggable={false}
            />
          )
        ) : currentPath ? (
          <MediaAsset
            src={currentPath}
            alt={label}
            cacheKey={assetRevision}
            fallback={
              <span className="flex h-full flex-col items-center justify-center gap-2 text-muted">
                <ImagePlus className="size-5" />
                <span className="text-[11px]">GIF, WebM, MP4, PNG</span>
              </span>
            }
          />
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="flex size-full flex-col items-center justify-center gap-2 text-muted transition-colors hover:bg-hover hover:text-ivory disabled:opacity-60"
          >
            <ImagePlus className="size-5" />
            <span className="text-[11px]">GIF, WebM, MP4, PNG</span>
          </button>
        )}

        {!editing && currentPath ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 bg-transparent"
            aria-label={`Replace ${label}`}
          />
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => clearDraft()}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-line px-2 py-1.5 text-[12px] text-muted hover:bg-hover hover:text-ivory disabled:opacity-60"
            >
              <X className="size-3.5" />
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveDraft()}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-accent px-2 py-1.5 text-[12px] font-medium text-white hover:bg-crimson-glow disabled:opacity-60"
            >
              <Check className="size-3.5" />
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full text-[11px] text-muted hover:text-ivory"
          >
            Choose a different file
          </button>
        </div>
      ) : null}

      {error ? <p className="text-[12px] text-accent">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept={PROFILE_ASSET_ACCEPT}
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
