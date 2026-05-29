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
import { useCallback, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { Button } from "~/components/ui/button";
import { toScheduleBuilderSnapshot } from "~/lib/schedule/builder-state";
import type {
  ScheduleBuilderInitialState,
  ScheduleBuilderSnapshot,
} from "~/validators/schedule-builder.validators";
import { EventCard } from "./event-card";
import { MatchupBlockOverlay } from "./matchup-block";
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
  const addEvent = useScheduleStore((state) => state.addEvent);
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

  const handleAddEvent = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    addEvent(format(new Date(), "MMM d, yyyy"), today);
  }, [addEvent]);

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
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex">
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

              <Button onClick={handleAddEvent}>
                <CalendarPlus className="mr-2 size-4" />
                Add Event
              </Button>
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
                <Button onClick={handleAddEvent} className="mt-4">
                  <CalendarPlus className="mr-2 size-4" />
                  Create First Event
                </Button>
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
  );
}
