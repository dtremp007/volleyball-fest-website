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
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { CalendarPlus, Check, Cloud, Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import {
  AUTOSAVE_INTERVAL,
  DEFAULT_SLOTS_PER_COURT,
  EventCard,
  getTimeForSlotIndex,
  MatchupBlockOverlay,
  UnscheduledPanel,
  useScheduleStore,
  type DragData,
  type DropData,
  type Matchup,
  type ScheduleEvent,
} from "~/components/schedule-builder";
import { Button } from "~/components/ui/button";
import { useTRPC } from "~/trpc/react";

export const Route = createFileRoute("/(authenticated)/seasons/$seasonId/build")({
  component: BuildPage,
  loader: async ({ params, context }) => {
    const { seasonId } = params;
    const data = await context.queryClient.fetchQuery(
      context.trpc.matchup.getBySeasonId.queryOptions({ seasonId }, { staleTime: 0 }),
    );
    return { data };
  },
});

function BuildPage() {
  const { seasonId } = Route.useParams();
  const trpc = useTRPC();

  // Fetch data
  const { data, refetch, isRefetching } = useSuspenseQuery(
    trpc.matchup.getBySeasonId.queryOptions({ seasonId }, { staleTime: 0 }),
  );

  // Mutations
  const saveMutation = useMutation(trpc.matchup.saveSchedule.mutationOptions());
  const regenerateMutation = useMutation(
    trpc.matchup.regenerateSchedule.mutationOptions(),
  );
  const { mutateAsync: saveScheduleAsync } = saveMutation;
  const { mutateAsync: regenerateScheduleAsync, isPending: isRegenerating } =
    regenerateMutation;

  // Store actions and state we need in the parent
  const init = useScheduleStore((state) => state.init);
  const addEvent = useScheduleStore((state) => state.addEvent);
  const setActiveMatchup = useScheduleStore((state) => state.setActiveMatchup);
  const moveScheduledToUnscheduled = useScheduleStore(
    (state) => state.moveScheduledToUnscheduled,
  );
  const moveMatchupToSlot = useScheduleStore((state) => state.moveMatchupToSlot);

  const eventIds = useScheduleStore(useShallow((state) => state.events.map((e) => e.id)));
  const activeMatchup = useScheduleStore((state) => state.activeMatchup);
  const isDirty = useScheduleStore((state) => state.isDirty);
  const lastSaved = useScheduleStore((state) => state.lastSaved);
  const setSaved = useScheduleStore((state) => state.setSaved);

  // Build initial state from DB data
  const initialState = useMemo(() => {
    const toMatchup = (matchupData: {
      id: string;
      teamA: Pick<
        Matchup["teamA"],
        "id" | "name" | "logoUrl" | "unavailableDates" | "isFarAway"
      >;
      teamB: Pick<
        Matchup["teamB"],
        "id" | "name" | "logoUrl" | "unavailableDates" | "isFarAway"
      >;
      category: string;
    }): Matchup => ({
      id: matchupData.id,
      teamA: { ...matchupData.teamA, category: matchupData.category },
      teamB: { ...matchupData.teamB, category: matchupData.category },
      category: matchupData.category,
    });

    const scheduledByEvent = data.scheduled.reduce(
      (acc, matchup) => {
        if (
          !matchup.eventId ||
          matchup.slotIndex === null ||
          (matchup.courtId !== "A" && matchup.courtId !== "B")
        ) {
          return acc;
        }

        if (!acc[matchup.eventId]) {
          acc[matchup.eventId] = {
            A: new Map(),
            B: new Map(),
            maxSlotIndex: -1,
          };
        }

        acc[matchup.eventId][matchup.courtId].set(matchup.slotIndex, matchup);
        acc[matchup.eventId].maxSlotIndex = Math.max(
          acc[matchup.eventId].maxSlotIndex,
          matchup.slotIndex,
        );

        return acc;
      },
      {} as Record<
        string,
        {
          A: Map<number, (typeof data.scheduled)[number]>;
          B: Map<number, (typeof data.scheduled)[number]>;
          maxSlotIndex: number;
        }
      >,
    );

    const events: ScheduleEvent[] = data.events.map((dbEvent) => {
      const eventSchedule = scheduledByEvent[dbEvent.id];
      const maxSlotIndex = eventSchedule?.maxSlotIndex ?? -1;
      const slotCount = Math.max(DEFAULT_SLOTS_PER_COURT, maxSlotIndex + 1);

      // Build courts with matchups placed
      const courts: [ScheduleEvent["courts"][0], ScheduleEvent["courts"][1]] = [
        {
          id: "A",
          slots: Array.from({ length: slotCount }, (_, i) => {
            const matchupData = eventSchedule?.A.get(i);
            return {
              id: `slot-${i}`,
              time: getTimeForSlotIndex(i),
              matchup: matchupData ? toMatchup(matchupData) : null,
            };
          }),
        },
        {
          id: "B",
          slots: Array.from({ length: slotCount }, (_, i) => {
            const matchupData = eventSchedule?.B.get(i);
            return {
              id: `slot-${i}`,
              time: getTimeForSlotIndex(i),
              matchup: matchupData ? toMatchup(matchupData) : null,
            };
          }),
        },
      ];

      return {
        id: dbEvent.id,
        name: dbEvent.name,
        date: dbEvent.date,
        courts,
      };
    });

    const unscheduled: Matchup[] = data.unscheduled.map((m) => toMatchup(m));

    // Build matchupsByCategory for the panel
    const matchupsByCategory = data.matchups.reduce(
      (acc, m) => {
        if (!acc[m.category]) acc[m.category] = [];
        acc[m.category].push(toMatchup(m));
        return acc;
      },
      {} as Record<string, Matchup[]>,
    );

    return { events, unscheduled, matchupsByCategory };
  }, [data]);

  // Track data identity to reset state when it changes
  const scheduleSignature = useMemo(
    () =>
      data.scheduled
        .map(
          (matchup) =>
            `${matchup.id}:${matchup.eventId ?? "none"}:${matchup.courtId ?? "none"}:${matchup.slotIndex ?? -1}`,
        )
        .sort()
        .join("|"),
    [data.scheduled],
  );
  const dataKey = useMemo(
    () =>
      `${seasonId}-${data.matchups.length}-${data.events.length}-${scheduleSignature}`,
    [seasonId, data.matchups.length, data.events.length, scheduleSignature],
  );
  const prevDataKeyRef = useRef(dataKey);

  useEffect(() => {
    let cancelled = false;
    if (dataKey !== prevDataKeyRef.current) {
      prevDataKeyRef.current = dataKey;
      queueMicrotask(() => {
        if (cancelled) return;
        init(initialState.events, initialState.unscheduled);
      });
    } else if (
      useScheduleStore.getState().events.length === 0 &&
      initialState.events.length > 0
    ) {
      // First load if state is empty
      init(initialState.events, initialState.unscheduled);
    }
    return () => {
      cancelled = true;
    };
  }, [dataKey, initialState, init]);

  // Initial mount load
  useEffect(() => {
    init(initialState.events, initialState.unscheduled);
  }, [init, initialState]);

  // Autosave
  const saveSchedule = useCallback(async () => {
    if (!useScheduleStore.getState().isDirty) return;

    const { events, unscheduledMatchups } = useScheduleStore.getState();

    // Build matchup placements from current state
    const matchupPlacements: {
      id: string;
      eventId: string | null;
      courtId: string | null;
      slotIndex: number | null;
    }[] = [];

    // Add scheduled matchups
    events.forEach((event) => {
      event.courts.forEach((court) => {
        court.slots.forEach((slot, slotIndex) => {
          if (slot.matchup) {
            matchupPlacements.push({
              id: slot.matchup.id,
              eventId: event.id,
              courtId: court.id,
              slotIndex,
            });
          }
        });
      });
    });

    // Add unscheduled matchups
    unscheduledMatchups.forEach((matchup) => {
      matchupPlacements.push({
        id: matchup.id,
        eventId: null,
        courtId: null,
        slotIndex: null,
      });
    });

    try {
      await saveScheduleAsync({
        seasonId,
        events: events.map((e) => ({ id: e.id, name: e.name, date: e.date })),
        matchups: matchupPlacements,
      });
      setSaved();
    } catch {
      toast.error("Failed to save schedule");
    }
  }, [seasonId, saveScheduleAsync, setSaved]);

  // Autosave interval
  useEffect(() => {
    const interval = setInterval(() => {
      saveSchedule();
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [saveSchedule]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (useScheduleStore.getState().isDirty) {
        saveSchedule();
      }
    };
  }, [saveSchedule]);

  const handleRegenerate = useCallback(async () => {
    const confirmationMessage = useScheduleStore.getState().isDirty
      ? "Regenerate schedule?\n\nThis will overwrite current matchup placements. Unsaved local changes will be lost."
      : "Regenerate schedule?\n\nThis will overwrite current matchup placements for this season.";
    const confirmed = window.confirm(confirmationMessage);
    if (!confirmed) return;

    try {
      const result = await regenerateScheduleAsync({ seasonId });
      await refetch();
      setSaved();

      if (result.unscheduledCount > 0) {
        toast.success(
          `Regenerated schedule: ${result.scheduledCount} placed, ${result.unscheduledCount} unscheduled.`,
        );
      } else {
        toast.success(`Regenerated schedule: ${result.scheduledCount} matchups placed.`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to regenerate schedule",
      );
    }
  }, [refetch, regenerateScheduleAsync, seasonId, setSaved]);

  // DnD sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  // Event handlers
  const handleAddEvent = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    addEvent(format(new Date(), "MMM d, yyyy"), today);
  }, [addEvent]);

  // Drag and drop handlers
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
      const dropData = over.data.current as DropData | { type: "unscheduled" };

      if (!dragData || dragData.type !== "matchup") return;

      const matchup = dragData.matchup;
      const source = dragData.source;

      // Handle dropping on unscheduled panel
      if (dropData?.type === "unscheduled") {
        if (source.type === "scheduled") {
          moveScheduledToUnscheduled(
            matchup,
            source.eventId,
            source.courtId,
            source.slotId,
            source.slotIndex,
          );
        }
        return;
      }

      // Handle dropping on a slot
      if (dropData?.type === "slot") {
        const { eventId, courtId, slotId } = dropData;
        const result = moveMatchupToSlot(matchup, source, eventId, courtId, slotId);

        if (!result.success && result.error) {
          toast.error(result.error);
        }
      }
    },
    [setActiveMatchup, moveScheduledToUnscheduled, moveMatchupToSlot],
  );

  // No matchups state - redirect should happen at index level, but keep as fallback
  if (!data.hasMatchups) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">No matchups for this season</h2>
          <p className="text-muted-foreground mt-2">
            Please configure teams and generate matchups first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex">
        {/* Left panel - unscheduled matchups */}
        <UnscheduledPanel matchupsByCategory={initialState.matchupsByCategory} />

        {/* Main content - events */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <div className="bg-card flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold tracking-tight">Build Schedule</h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Save status indicator */}
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                {saveMutation.isPending ? (
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

              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating || isRefetching || saveMutation.isPending}
              >
                {isRegenerating || isRefetching ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    Regenerate
                  </>
                )}
              </Button>

              <Button onClick={handleAddEvent}>
                <CalendarPlus className="mr-2 size-4" />
                Add Event
              </Button>
            </div>
          </div>

          {/* Events area */}
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

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeMatchup ? <MatchupBlockOverlay matchup={activeMatchup} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
