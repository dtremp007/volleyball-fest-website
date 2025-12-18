import { cn } from "~/lib/utils";
import { TimeSlot } from "./time-slot";
import type { Court } from "./types";

type CourtColumnProps = {
  court: Court;
  eventId: string;
};

export function CourtColumn({ court, eventId }: CourtColumnProps) {
  return (
    <div className="flex-1 min-w-[200px]">
      {/* Court header */}
      <div
        className={cn(
          "text-center font-semibold text-sm py-2 rounded-t-lg",
          court.id === "A"
            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
        )}
      >
        Court {court.id}
      </div>

      {/* Time slots */}
      <div className="space-y-2 p-2 pl-24 bg-card/50 rounded-b-lg border border-t-0 border-border/50">
        {court.slots.map((slot) => (
          <TimeSlot key={slot.id} slot={slot} eventId={eventId} courtId={court.id} />
        ))}
      </div>
    </div>
  );
}
