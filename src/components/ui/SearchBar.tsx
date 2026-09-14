import { Search } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";

export function SearchBar() {
  const searchQuery = useUiStore((state) => state.searchQuery);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);

  return (
    <label className="glass-panel relative flex h-10 w-full max-w-xl items-center gap-3 rounded-2xl px-3.5">
      <Search className="size-4 shrink-0 text-ivory/45" aria-hidden="true" />
      <input
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search your library..."
        className="h-full w-full bg-transparent text-sm text-ivory outline-none placeholder:text-ivory/35"
      />
    </label>
  );
}
