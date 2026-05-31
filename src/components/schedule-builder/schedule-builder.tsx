import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { format } from "date-fns";
import { CalendarPlus, Check, Cloud, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "~/components/ui/popover";
import { toScheduleBuilderSnapshot } from "~/lib/schedule/builder-state";
import { combineDateAndTime, getTimePart } from "~/lib/schedule/slot-times";
import type {
  ScheduleBuilderInitialState,
  ScheduleBuilderSnapshot,
} from "~/validators/schedule-builder.validators";
import { EventCard } from "./event-card";
import { MatchupBlockOverlay } from "./matchup-block";
import { ScheduleBuilderMobileNotice } from "./schedule-builder-mobile-notice";
import { useScheduleStore } from "./store";
import type { DragData, DropData } from "./types";
import { UnscheduledPanel } from "./unscheduled-panel";
import { AUTOSAVE_INTERVAL } from "./utils";

export type ScheduleBuilderProps = {
  initialState: ScheduleBuilderInitialState;
  onSave: (snapshot: ScheduleBuilderSnapshot) => Promise<void>;
  isSaving?: boolean;
  toolbarActions?: ReactNode;
  title?: string;
  autosaveIntervalMs?: number;
};

export function ScheduleBuilder({
  initialState,
  onSave,
  isSaving = false,
  toolbarActions,
  title = "Build Schedule",
  autosaveIntervalMs = AUTOSAVE_INTERVAL,
}: ScheduleBuilderProps) {
  const init = useScheduleStore((state) => state.init);
  const addEvents = useScheduleStore((state) => state.addEvents);
  const setActiveMatchup = useScheduleStore((state) => state.setActiveMatchup);
  const moveScheduledToUnscheduled = useScheduleStore(
    (state) => state.moveScheduledToUnscheduled,
  );
  const moveMatchupToCourt = useScheduleStore((state) => state.moveMatchupToCourt);
  const reorderMatchup = useScheduleStore((state) => state.reorderMatchup);

  const eventIds = useScheduleStore(useShallow((state) => state.events.map((e) => e.id)));
  const activeMatchup = useScheduleStore((state) => state.activeMatchup);
  const isDirty = useScheduleStore((state) => state.isDirty);
  const lastSaved = useScheduleStore((state) => state.lastSaved);
  const setSaved = useScheduleStore((state) => state.setSaved);

  useEffect(() => {
    init(initialState.events, initialState.unscheduledMatchups);
  }, [initialState, init]);

  const persistIfDirty = useCallback(async () => {
    if (!useScheduleStore.getState().isDirty) return;

    const { events, unscheduledMatchups } = useScheduleStore.getState();
    const snapshot = toScheduleBuilderSnapshot(events, unscheduledMatchups);

    try {
      await onSave(snapshot);
      setSaved();
    } catch {
      toast.error("Failed to save schedule");
    }
  }, [onSave, setSaved]);

  useEffect(() => {
    const interval = setInterval(() => {
      void persistIfDirty();
    }, autosaveIntervalMs);

    return () => clearInterval(interval);
  }, [autosaveIntervalMs, persistIfDirty]);

  useEffect(() => {
    return () => {
      if (useScheduleStore.getState().isDirty) {
        void persistIfDirty();
      }
    };
  }, [persistIfDirty]);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const handleAddEvents = useCallback(
    (dates: Date[], startTime: string) => {
      const events = dates
        .map((date) => ({
          name: format(date, "MMM d, yyyy"),
          date: combineDateAndTime(format(date, "yyyy-MM-dd"), startTime),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      addEvents(events);
    },
    [addEvents],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const dragData = event.active.data.current as DragData;
      if (dragData?.type === "matchup") {
        setActiveMatchup(dragData.matchup);
      }
    },
    [setActiveMatchup],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveMatchup(null);

      const { active, over } = event;
      if (!over) return;

      const dragData = active.data.current as DragData;
      if (!dragData || dragData.type !== "matchup") return;

      const matchup = dragData.matchup;
      const source = dragData.source;
      const overData = over.data.current as
        | DropData
        | { type: "unscheduled" }
        | DragData
        | undefined;

      if (overData?.type === "unscheduled") {
        if (source.type === "scheduled") {
          moveScheduledToUnscheduled(
            matchup,
            source.eventId,
            source.courtId,
            source.index,
          );
        }
        return;
      }

      if (overData?.type === "court") {
        const { eventId, courtId } = overData as DropData;
        moveMatchupToCourt(matchup, source, eventId, courtId);
        return;
      }

      if (overData?.type === "matchup") {
        const overDragData = overData as DragData;
        const overSource = overDragData.source;

        if (source.type === "scheduled" && overSource.type === "scheduled") {
          if (
            source.eventId === overSource.eventId &&
            source.courtId === overSource.courtId
          ) {
            reorderMatchup(
              source.eventId,
              source.courtId,
              matchup.id,
              overDragData.matchup.id,
            );
            return;
          }

          moveMatchupToCourt(
            matchup,
            source,
            overSource.eventId,
            overSource.courtId,
            overSource.index,
          );
          return;
        }

        if (source.type === "unscheduled" && overSource.type === "scheduled") {
          moveMatchupToCourt(
            matchup,
            source,
            overSource.eventId,
            overSource.courtId,
            overSource.index,
          );
        }
      }
    },
    [setActiveMatchup, moveScheduledToUnscheduled, moveMatchupToCourt, reorderMatchup],
  );

  return (
    <>
      <ScheduleBuilderMobileNotice title={title} />

      <div className="hidden min-h-0 md:flex md:flex-1 md:flex-col">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex min-h-0 flex-1">
            <UnscheduledPanel matchupsByCategory={initialState.matchupsByCategory} />

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="bg-card flex items-center justify-between border-b p-4">
                <h2 className="text-xl font-semibold tracking-tight">{title}</h2>

                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    {isSaving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : isDirty ? (
                      <>
                        <Cloud className="size-4" />
                        <span>Unsaved changes</span>
                      </>
                    ) : lastSaved ? (
                      <>
                        <Check className="size-4 text-green-500" />
                        <span>Saved</span>
                      </>
                    ) : null}
                  </div>

                  {toolbarActions}

                  <AddEventsPopover onAddEvents={handleAddEvents} />
                </div>
              </div>

              <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
                {eventIds.length === 0 ? (
                  <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
                    <CalendarPlus className="mb-4 size-16 opacity-30" />
                    <p className="text-lg font-medium">No events yet</p>
                    <p className="mt-1 text-sm">
                      Create an event to start scheduling matchups
                    </p>
                    <AddEventsPopover
                      onAddEvents={handleAddEvents}
                      triggerClassName="mt-4"
                    >
                      Create First Event
                    </AddEventsPopover>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6 pb-4">
                    {eventIds.map((eventId) => (
                      <EventCard key={eventId} eventId={eventId} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeMatchup ? <MatchupBlockOverlay matchup={activeMatchup} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </>
  );
}

type AddEventsPopoverProps = {
  onAddEvents: (dates: Date[], startTime: string) => void;
  children?: ReactNode;
  triggerClassName?: string;
};

function AddEventsPopover({
  onAddEvents,
  children = "Add Event",
  triggerClassName,
}: AddEventsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[] | undefined>();
  const [startTime, setStartTime] = useState(() => getTimePart(""));

  const selectedCount = selectedDates?.length ?? 0;
  const sortedDates = useMemo(
    () => [...(selectedDates ?? [])].sort((a, b) => a.getTime() - b.getTime()),
    [selectedDates],
  );

  const handleCreate = useCallback(() => {
    if (sortedDates.length === 0) return;
    onAddEvents(sortedDates, startTime);
    setSelectedDates(undefined);
    setOpen(false);
  }, [onAddEvents, sortedDates, startTime]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button className={triggerClassName}>
          <CalendarPlus className="mr-2 size-4" />
          {children}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="border-b px-4 py-3">
          <PopoverHeader>
            <PopoverTitle>Create events</PopoverTitle>
            <PopoverDescription>
              Select one or more dates and a start time.
            </PopoverDescription>
          </PopoverHeader>
        </div>
        <Calendar
          mode="multiple"
          selected={selectedDates}
          onSelect={setSelectedDates}
          autoFocus
        />
        <div className="border-t px-3 py-3">
          <Label htmlFor="event-start-time" className="text-xs">
            Start time
          </Label>
          <Input
            id="event-start-time"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className="mt-1 h-9"
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t p-3">
          <span className="text-muted-foreground text-sm">
            {selectedCount === 0
              ? "No dates selected"
              : `${selectedCount} date${selectedCount === 1 ? "" : "s"} selected`}
          </span>
          <Button size="sm" onClick={handleCreate} disabled={selectedCount === 0}>
            Create
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
