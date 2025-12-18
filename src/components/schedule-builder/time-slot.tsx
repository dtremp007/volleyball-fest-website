import { useDroppable } from "@dnd-kit/core";
import { Clock } from "lucide-react";
import { cn } from "~/lib/utils";
import { MatchupBlock } from "./matchup-block";
import type { DropData, TimeSlot as TimeSlotType } from "./types";

type TimeSlotProps = {
  slot: TimeSlotType;
  eventId: string;
  courtId: "A" | "B";
};

export function TimeSlot({ slot, eventId, courtId }: TimeSlotProps) {
  const dropData: DropData = {
    type: "slot",
    eventId,
    courtId,
    slotId: slot.id,
  };

  const { isOver, setNodeRef, active } = useDroppable({
    id: `slot-${eventId}-${courtId}-${slot.id}`,
    data: dropData,
  });

  const hasMatchup = slot.matchup !== null;
  const isDraggingMatchup = active?.data?.current?.type === "matchup";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative min-h-[100px] rounded-lg border-2 border-dashed transition-all p-2",
        hasMatchup
          ? "border-transparent bg-transparent"
          : "border-muted-foreground/20 bg-muted/30",
        isOver && !hasMatchup && isDraggingMatchup && "border-primary bg-primary/10 scale-[1.02]",
        !hasMatchup && isDraggingMatchup && "border-muted-foreground/40",
      )}
    >
      {/* Time indicator */}
      <div className="absolute -left-22 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3" />
        <span className="font-mono">{slot.time}</span>
      </div>

      {hasMatchup ? (
        <MatchupBlock
          matchup={slot.matchup!}
          source={{ type: "scheduled", eventId, courtId, slotId: slot.id }}
        />
      ) : (
        <div className="flex items-center justify-center h-full min-h-[84px] text-xs text-muted-foreground/50">
          {isOver && isDraggingMatchup ? "Drop here" : "Empty slot"}
        </div>
      )}
    </div>
  );
}
