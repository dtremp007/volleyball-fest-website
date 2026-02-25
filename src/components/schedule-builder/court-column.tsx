import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Clock } from "lucide-react";
import { memo, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { cn } from "~/lib/utils";
import { MatchupBlock } from "./matchup-block";
import { useScheduleStore } from "./store";
import type { DropData } from "./types";
import { getTimeForSlotIndex } from "./utils";

type CourtColumnProps = {
  courtId: "A" | "B";
  eventId: string;
};

export const CourtColumn = memo(function CourtColumn({
  courtId,
  eventId,
}: CourtColumnProps) {
  const matchupIds = useScheduleStore(
    useShallow((state) => {
      const event = state.events.find((e) => e.id === eventId);
      const court = event?.courts.find((c) => c.id === courtId);
      return court?.matchups.map((m) => m.id) ?? [];
    }),
  );

  const sortableItems = useMemo(
    () => matchupIds.map((id) => `matchup-${id}-${eventId}-${courtId}`),
    [matchupIds, eventId, courtId],
  );

  const dropData: DropData = useMemo(
    () => ({ type: "court", eventId, courtId }),
    [eventId, courtId],
  );

  const { isOver, setNodeRef, active } = useDroppable({
    id: `court-drop-${eventId}-${courtId}`,
    data: dropData,
  });

  const isDraggingMatchup = active?.data?.current?.type === "matchup";
  const isEmpty = matchupIds.length === 0;

  return (
    <div className="min-w-[200px] flex-1">
      <div
        className={cn(
          "rounded-t-lg py-2 text-center text-sm font-semibold",
          courtId === "A"
            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
        )}
      >
        Court {courtId}
      </div>

      <div className="bg-card/50 border-border/50 rounded-b-lg border border-t-0 p-2 pl-24">
        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {matchupIds.map((matchupId, index) => (
              <div key={matchupId} className="relative">
                <div className="text-muted-foreground absolute top-1/2 -left-22 flex -translate-y-1/2 items-center gap-1.5 text-xs">
                  <Clock className="size-3" />
                  <span className="font-mono">{getTimeForSlotIndex(index)}</span>
                </div>
                <MatchupBlock
                  matchupId={matchupId}
                  eventId={eventId}
                  courtId={courtId}
                  index={index}
                />
              </div>
            ))}
          </div>
        </SortableContext>

        {/* Drop zone for appending */}
        <div
          ref={setNodeRef}
          className={cn(
            "mt-2 min-h-[48px] rounded-lg border-2 border-dashed transition-all",
            isEmpty && "min-h-[84px]",
            isOver && isDraggingMatchup
              ? "border-primary bg-primary/10"
              : "border-muted-foreground/20 bg-muted/30",
            !isOver && isDraggingMatchup && "border-muted-foreground/40",
          )}
        >
          <div className="text-muted-foreground/50 flex h-full min-h-[inherit] items-center justify-center text-xs">
            {isOver && isDraggingMatchup
              ? "Drop here"
              : isEmpty
                ? "Drop matchups here"
                : ""}
          </div>
        </div>
      </div>
    </div>
  );
});
