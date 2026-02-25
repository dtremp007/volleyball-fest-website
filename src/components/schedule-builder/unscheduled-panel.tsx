import { useDroppable } from "@dnd-kit/core";
import { Inbox } from "lucide-react";
import { memo, useMemo } from "react";
import { cn } from "~/lib/utils";
import { UnscheduledMatchupBlock } from "./matchup-block";
import { useScheduleStore } from "./store";
import type { Matchup } from "./types";

type UnscheduledPanelProps = {
  matchupsByCategory: Record<string, Matchup[]>;
};

export const UnscheduledPanel = memo(function UnscheduledPanel({
  matchupsByCategory,
}: UnscheduledPanelProps) {
  const matchups = useScheduleStore((state) => state.unscheduledMatchups);

  const { isOver, setNodeRef, active } = useDroppable({
    id: "unscheduled-panel",
    data: { type: "unscheduled" },
  });

  const isDraggingScheduledMatchup =
    active?.data?.current?.type === "matchup" &&
    active?.data?.current?.source?.type === "scheduled";

  const categories = useMemo(() => Object.keys(matchupsByCategory), [matchupsByCategory]);
  const unscheduledIds = useMemo(() => new Set(matchups.map((m) => m.id)), [matchups]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-card sticky top-[49px] flex h-[calc(100vh-3rem)] w-72 shrink-0 flex-col border-r transition-colors",
        isOver && isDraggingScheduledMatchup && "bg-primary/5",
      )}
    >
      {/* Header */}
      <div className="h-[87px] border-b p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Inbox className="size-5" />
          Unscheduled
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {matchups.length} matchup{matchups.length !== 1 ? "s" : ""} remaining
        </p>
      </div>

      {/* Matchups by category */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="space-y-6 p-4">
            {matchups.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                <Inbox className="mx-auto mb-3 size-12 opacity-30" />
                <p className="text-sm">All matchups scheduled!</p>
              </div>
            ) : (
              categories.map((category) => {
                const categoryMatchups =
                  matchupsByCategory[category]?.filter((m) => unscheduledIds.has(m.id)) ??
                  [];

                if (categoryMatchups.length === 0) return null;

                return (
                  <div key={category}>
                    <h3 className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {categoryMatchups.map((matchup) => (
                        <UnscheduledMatchupBlock
                          key={matchup.id}
                          matchup={matchup}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Drop indicator */}
      {isDraggingScheduledMatchup && (
        <div
          className={cn(
            "m-4 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-all",
            isOver
              ? "border-primary bg-primary/10 text-primary"
              : "border-muted-foreground/30 text-muted-foreground",
          )}
        >
          Drop here to unschedule
        </div>
      )}
    </div>
  );
});
