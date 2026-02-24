import { useDroppable } from "@dnd-kit/core";
import { Clock } from "lucide-react";
import { memo } from "react";
import { cn } from "~/lib/utils";
import { MatchupBlock } from "./matchup-block";
import { useScheduleStore } from "./store";
import type { DropData } from "./types";

type TimeSlotProps = {
  slotId: string;
  eventId: string;
  courtId: "A" | "B";
  slotIndex: number;
};

export const TimeSlot = memo(function TimeSlot({
  slotId,
  eventId,
  courtId,
  slotIndex,
}: TimeSlotProps) {
  const slot = useScheduleStore((state) => {
    const event = state.events.find((e) => e.id === eventId);
    const court = event?.courts.find((c) => c.id === courtId);
    return court?.slots.find((s) => s.id === slotId);
  });

  const dropData: DropData = {
    type: "slot",
    eventId,
    courtId,
    slotId,
  };

  const { isOver, setNodeRef, active } = useDroppable({
    id: `slot-${eventId}-${courtId}-${slotId}`,
    data: dropData,
  });

  if (!slot) return null;

  const hasMatchup = slot.matchup !== null;
  const isDraggingMatchup = active?.data?.current?.type === "matchup";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative min-h-[100px] rounded-lg border-2 border-dashed p-2 transition-all",
        hasMatchup
          ? "border-transparent bg-transparent"
          : "border-muted-foreground/20 bg-muted/30",
        isOver &&
          !hasMatchup &&
          isDraggingMatchup &&
          "border-primary bg-primary/10 scale-[1.02]",
        !hasMatchup && isDraggingMatchup && "border-muted-foreground/40",
      )}
    >
      {/* Time indicator */}
      <div className="text-muted-foreground absolute top-1/2 -left-22 flex -translate-y-1/2 items-center gap-1.5 text-xs">
        <Clock className="size-3" />
        <span className="font-mono">{slot.time}</span>
      </div>

      {hasMatchup ? (
        <MatchupBlock
          matchup={slot.matchup!}
          source={{ type: "scheduled", eventId, courtId, slotId, slotIndex }}
        />
      ) : (
        <div className="text-muted-foreground/50 flex h-full min-h-[84px] items-center justify-center text-xs">
          {isOver && isDraggingMatchup ? "Drop here" : "Empty slot"}
        </div>
      )}
    </div>
  );
});
