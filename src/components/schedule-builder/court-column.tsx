import { memo } from "react";
import { useShallow } from "zustand/react/shallow";
import { cn } from "~/lib/utils";
import { useScheduleStore } from "./store";
import { TimeSlot } from "./time-slot";

type CourtColumnProps = {
  courtId: "A" | "B";
  eventId: string;
};

export const CourtColumn = memo(function CourtColumn({
  courtId,
  eventId,
}: CourtColumnProps) {
  const slotIds = useScheduleStore(
    useShallow((state) => {
      const event = state.events.find((e) => e.id === eventId);
      const court = event?.courts.find((c) => c.id === courtId);
      return court?.slots.map((s) => s.id) ?? [];
    }),
  );

  return (
    <div className="min-w-[200px] flex-1">
      {/* Court header */}
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

      {/* Time slots */}
      <div className="bg-card/50 border-border/50 space-y-2 rounded-b-lg border border-t-0 p-2 pl-24">
        {slotIds.map((slotId, slotIndex) => (
          <TimeSlot
            key={slotId}
            slotId={slotId}
            eventId={eventId}
            courtId={courtId}
            slotIndex={slotIndex}
          />
        ))}
      </div>
    </div>
  );
});
