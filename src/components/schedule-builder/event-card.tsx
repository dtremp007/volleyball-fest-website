import { MoreVertical, Trash2 } from "lucide-react";
import { memo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { combineDateAndTime, getDatePart, getTimePart } from "~/lib/schedule/slot-times";
import { CourtColumn } from "./court-column";
import { useScheduleStore } from "./store";
import { countScoredMatchups } from "./utils";

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
  const eventStartTime = useScheduleStore(
    (state) =>
      state.events.find((e) => e.id === eventId)?.startTime ?? getTimePart(eventDate),
  );
  const courtIds = useScheduleStore(
    useShallow(
      (state) =>
        state.events.find((e) => e.id === eventId)?.courts.map((c) => c.id) ?? [],
    ),
  );

  const matchupCount = useScheduleStore((state) => {
    const event = state.events.find((e) => e.id === eventId);
    return event?.courts.reduce((count, court) => count + court.matchups.length, 0) ?? 0;
  });
  const scoredCount = useScheduleStore((state) => {
    const event = state.events.find((e) => e.id === eventId);
    return event ? countScoredMatchups(event) : 0;
  });

  const updateEvent = useScheduleStore((state) => state.updateEvent);
  const deleteEvent = useScheduleStore((state) => state.deleteEvent);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <label>
              <span className="sr-only">Event date</span>
              <input
                type="date"
                value={getDatePart(eventDate)}
                onChange={(e) =>
                  updateEvent(eventId, {
                    date: combineDateAndTime(e.target.value, eventStartTime),
                  })
                }
                className="border-none bg-transparent outline-none focus:ring-0"
              />
            </label>
            <label>
              <span className="sr-only">Event start time</span>
              <input
                type="time"
                value={eventStartTime}
                onChange={(e) =>
                  updateEvent(eventId, {
                    date: combineDateAndTime(getDatePart(eventDate), e.target.value),
                    startTime: e.target.value,
                  })
                }
                className="border-none bg-transparent outline-none focus:ring-0"
              />
            </label>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={scoredCount > 0}
              onClick={() => {
                if (matchupCount === 0) deleteEvent(eventId);
                else setConfirmDeleteOpen(true);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              {scoredCount > 0 ? "Can't delete: has games with scores" : "Delete event"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {eventName || "this event"}?</AlertDialogTitle>
              <AlertDialogDescription>
                Its {matchupCount} game{matchupCount === 1 ? "" : "s"} will move back to
                unscheduled and the night will disappear from the public schedule once
                saved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => deleteEvent(eventId)}
              >
                Delete event
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Courts */}
      <div className="flex gap-2 p-4">
        {courtIds.map((courtId) => (
          <CourtColumn key={courtId} courtId={courtId} eventId={eventId} />
        ))}
      </div>
    </div>
  );
});
