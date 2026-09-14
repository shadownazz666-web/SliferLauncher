import { useEffect, useState } from "react";
import { GameActionBar, type GameTab } from "@/components/library/GameActionBar";
import { GameActivity } from "@/components/library/GameActivity";
import { GameHero } from "@/components/library/GameHero";
import type { LibraryGame } from "@/types/library";

interface GameDetailViewProps {
  game: LibraryGame;
}

export function GameDetailView({ game }: GameDetailViewProps) {
  const [tab, setTab] = useState<GameTab>("Store Page");
  const [achievementsOpen, setAchievementsOpen] = useState(false);

  useEffect(() => {
    setAchievementsOpen(false);
    setTab("Store Page");
  }, [game.id]);

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-transparent">
      <GameHero game={game} />
      <GameActionBar
        game={game}
        tab={tab}
        onTab={(next) => {
          setAchievementsOpen(false);
          setTab(next);
        }}
        onOpenAchievements={() => setAchievementsOpen(true)}
      />
      <GameActivity
        game={game}
        tab={tab}
        achievementsOpen={achievementsOpen}
        onAchievementsOpenChange={setAchievementsOpen}
      />
    </div>
  );
}
