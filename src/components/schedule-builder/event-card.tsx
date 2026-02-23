import { Calendar, MoreVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { CourtColumn } from "./court-column";
import type { ScheduleEvent } from "./types";

type EventCardProps = {
  event: ScheduleEvent;
  onAddSlot: (eventId: string) => void;
  onDeleteEvent: (eventId: string) => void;
  onUpdateEvent: (eventId: string, updates: Partial<Pick<ScheduleEvent, "name" | "date">>) => void;
};

export function EventCard({ event, onAddSlot, onDeleteEvent, onUpdateEvent }: EventCardProps) {
  return (
    <div className="shrink-0 min-w-[600px] w-full max-w-[1000px] bg-card rounded-xl border shadow-sm">
      {/* Event header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex-1">
          <input
            type="text"
            value={event.name}
            onChange={(e) => onUpdateEvent(event.id, { name: e.target.value })}
            className="text-lg font-semibold bg-transparent border-none outline-none focus:ring-0 w-full"
            placeholder="Event name"
          />
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Calendar className="size-4" />
            <input
              type="date"
              value={event.date.split("T")[0]}
              onChange={(e) => onUpdateEvent(event.id, { date: e.target.value })}
              className="bg-transparent border-none outline-none focus:ring-0"
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
            <DropdownMenuItem onClick={() => onAddSlot(event.id)}>
              <Plus className="size-4 mr-2" />
              Add time slot
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDeleteEvent(event.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4 mr-2" />
              Delete event
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Courts */}
      <div className="flex gap-2 p-4">
        {event.courts.map((court) => (
          <CourtColumn key={court.id} court={court} eventId={event.id} />
        ))}
      </div>

      {/* Add slot button */}
      <div className="px-4 pb-4">
        <Button variant="outline" size="sm" className="w-full" onClick={() => onAddSlot(event.id)}>
          <Plus className="size-4 mr-2" />
          Add time slot
        </Button>
      </div>
    </div>
  );
}
