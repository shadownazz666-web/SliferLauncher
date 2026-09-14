import { UpdatesView } from "@/components/updates/UpdatesView";
import { useT } from "@/i18n";

export function UpdatesPage() {
  const t = useT();
  return (
    <div className="h-full overflow-y-auto bg-transparent px-4 py-4">
      <p className="mb-3 px-4 text-[12px] tracking-[0.16em] text-accent">{t("updates.eyebrow")}</p>
      <UpdatesView />
    </div>
  );
}
