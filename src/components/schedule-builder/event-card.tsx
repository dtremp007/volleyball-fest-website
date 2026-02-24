import { Calendar, MoreVertical, Plus, Trash2 } from "lucide-react";
import { memo } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { CourtColumn } from "./court-column";
import { useScheduleStore } from "./store";

type EventCardProps = {
  eventId: string;
};

export const EventCard = memo(function EventCard({ eventId }: EventCardProps) {
  const eventName = useScheduleStore(
    (state) => state.events.find((e) => e.id === eventId)?.name ?? "",
  );
  const eventDate = useScheduleStore(
    (state) => state.events.find((e) => e.id === eventId)?.date ?? "",
  );
  const courtIds = useScheduleStore(
    useShallow(
      (state) =>
        state.events.find((e) => e.id === eventId)?.courts.map((c) => c.id) ?? [],
    ),
  );

  const updateEvent = useScheduleStore((state) => state.updateEvent);
  const deleteEvent = useScheduleStore((state) => state.deleteEvent);
  const addSlot = useScheduleStore((state) => state.addSlot);

  if (!eventName && !eventDate) return null;

  return (
    <div className="bg-card w-full max-w-[1000px] min-w-[600px] shrink-0 rounded-xl border shadow-sm">
      {/* Event header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex-1">
          <input
            type="text"
            value={eventName}
            onChange={(e) => updateEvent(eventId, { name: e.target.value })}
            className="w-full border-none bg-transparent text-lg font-semibold outline-none focus:ring-0"
            placeholder="Event name"
          />
          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
            <Calendar className="size-4" />
            <input
              type="date"
              value={eventDate.split("T")[0]}
              onChange={(e) => updateEvent(eventId, { date: e.target.value })}
              className="border-none bg-transparent outline-none focus:ring-0"
            />
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => addSlot(eventId)}>
              <Plus className="mr-2 size-4" />
              Add time slot
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => deleteEvent(eventId)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              Delete event
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Courts */}
      <div className="flex gap-2 p-4">
        {courtIds.map((courtId) => (
          <CourtColumn key={courtId} courtId={courtId} eventId={eventId} />
        ))}
      </div>

      {/* Add slot button */}
      <div className="px-4 pb-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => addSlot(eventId)}
        >
          <Plus className="mr-2 size-4" />
          Add time slot
        </Button>
      </div>
    </div>
  );
});
