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
import { CalendarPlus, Check, Cloud, Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import {
  EventCard,
  MatchupBlockOverlay,
  UnscheduledPanel,
  type DragData,
  type DropData,
  type Matchup,
  type ScheduleEvent,
  type TimeSlotData,
} from "~/components/schedule-builder";
import { Button } from "~/components/ui/button";
import { isDateUnavailable } from "~/lib/unavailable-dates";
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

// Time slot generation utilities
const START_HOUR = 16; // 4 PM
const START_MINUTE = 15;
const SLOT_DURATION_MINUTES = 45;
const DEFAULT_SLOTS_PER_COURT = 7;
const AUTOSAVE_INTERVAL = 5000; // 5 seconds
const MAX_GAMES_PER_EVENT = 2;

function teamsOverlap(teamAId: string, teamBId: string, otherTeamAId: string, otherTeamBId: string) {
  return (
    teamAId === otherTeamAId ||
    teamAId === otherTeamBId ||
    teamBId === otherTeamAId ||
    teamBId === otherTeamBId
  );
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
}

function getTimeForSlotIndex(slotIndex: number): string {
  const totalMinutes = START_HOUR * 60 + START_MINUTE + slotIndex * SLOT_DURATION_MINUTES;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return formatTime(hour, minute);
}

function generateTimeSlots(count: number, startIndex: number = 0): TimeSlotData[] {
  return Array.from({ length: count }, (_, i) => {
    const slotIndex = startIndex + i;
    return {
      id: `slot-${slotIndex}`,
      time: getTimeForSlotIndex(slotIndex),
      matchup: null,
    };
  });
}

function createNewEvent(name: string, date: string): ScheduleEvent {
  return {
    id: uuidv4(),
    name,
    date,
    courts: [
      { id: "A", slots: generateTimeSlots(DEFAULT_SLOTS_PER_COURT) },
      { id: "B", slots: generateTimeSlots(DEFAULT_SLOTS_PER_COURT) },
    ],
  };
}

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

  // Build initial state from DB data
  const initialState = useMemo(() => {
    const events: ScheduleEvent[] = data.events.map((dbEvent) => {
      // Find all matchups for this event
      const eventMatchups = data.scheduled.filter((m) => m.eventId === dbEvent.id);

      // Determine how many slots we need based on max slotIndex
      const maxSlotIndex = eventMatchups.reduce(
        (max, m) => Math.max(max, m.slotIndex ?? 0),
        -1,
      );
      const slotCount = Math.max(DEFAULT_SLOTS_PER_COURT, maxSlotIndex + 1);

      // Build courts with matchups placed
      const courts: [ScheduleEvent["courts"][0], ScheduleEvent["courts"][1]] = [
        {
          id: "A",
          slots: Array.from({ length: slotCount }, (_, i) => {
            const matchupData = eventMatchups.find(
              (m) => m.courtId === "A" && m.slotIndex === i,
            );
            return {
              id: `slot-${i}`,
              time: getTimeForSlotIndex(i),
              matchup: matchupData
                ? {
                    id: matchupData.id,
                    teamA: { ...matchupData.teamA, category: matchupData.category },
                    teamB: { ...matchupData.teamB, category: matchupData.category },
                    category: matchupData.category,
                  }
                : null,
            };
          }),
        },
        {
          id: "B",
          slots: Array.from({ length: slotCount }, (_, i) => {
            const matchupData = eventMatchups.find(
              (m) => m.courtId === "B" && m.slotIndex === i,
            );
            return {
              id: `slot-${i}`,
              time: getTimeForSlotIndex(i),
              matchup: matchupData
                ? {
                    id: matchupData.id,
                    teamA: { ...matchupData.teamA, category: matchupData.category },
                    teamB: { ...matchupData.teamB, category: matchupData.category },
                    category: matchupData.category,
                  }
                : null,
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

    const unscheduled: Matchup[] = data.unscheduled.map((m) => ({
      id: m.id,
      teamA: { ...m.teamA, category: m.category },
      teamB: { ...m.teamB, category: m.category },
      category: m.category,
    }));

    // Build matchupsByCategory for the panel
    const matchupsByCategory = data.matchups.reduce(
      (acc, m) => {
        if (!acc[m.category]) acc[m.category] = [];
        acc[m.category].push({
          id: m.id,
          teamA: { ...m.teamA, category: m.category },
          teamB: { ...m.teamB, category: m.category },
          category: m.category,
        });
        return acc;
      },
      {} as Record<string, Matchup[]>,
    );

    return { events, unscheduled, matchupsByCategory };
  }, [data]);

  // State - use data.events as key to reset when season changes
  const [events, setEvents] = useState<ScheduleEvent[]>(() => initialState.events);
  const [unscheduledMatchups, setUnscheduledMatchups] = useState<Matchup[]>(
    () => initialState.unscheduled,
  );
  const [activeMatchup, setActiveMatchup] = useState<Matchup | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Track data identity to reset state when it changes
  const scheduleSignature = data.scheduled
    .map(
      (matchup) =>
        `${matchup.id}:${matchup.eventId ?? "none"}:${matchup.courtId ?? "none"}:${matchup.slotIndex ?? -1}`,
    )
    .sort()
    .join("|");
  const dataKey = `${seasonId}-${data.matchups.length}-${data.events.length}-${scheduleSignature}`;
  const [prevDataKey, setPrevDataKey] = useState(dataKey);
  if (dataKey !== prevDataKey) {
    setPrevDataKey(dataKey);
    setEvents(initialState.events);
    setUnscheduledMatchups(initialState.unscheduled);
    setIsDirty(false);
  }

  // Autosave
  const saveSchedule = useCallback(async () => {
    if (!isDirty) return;

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
      setIsDirty(false);
      setLastSaved(new Date());
    } catch {
      toast.error("Failed to save schedule");
    }
  }, [isDirty, events, unscheduledMatchups, seasonId, saveScheduleAsync]);

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
      if (isDirty) {
        saveSchedule();
      }
    };
  }, [isDirty, saveSchedule]);

  // Mark dirty on any state change
  const markDirty = useCallback(() => setIsDirty(true), []);

  const handleRegenerate = useCallback(async () => {
    const confirmationMessage = isDirty
      ? "Regenerate schedule?\n\nThis will overwrite current matchup placements. Unsaved local changes will be lost."
      : "Regenerate schedule?\n\nThis will overwrite current matchup placements for this season.";
    const confirmed = window.confirm(confirmationMessage);
    if (!confirmed) return;

    try {
      const result = await regenerateScheduleAsync({ seasonId });
      await refetch();
      setIsDirty(false);
      setLastSaved(new Date());

      if (result.unscheduledCount > 0) {
        toast.success(
          `Regenerated schedule: ${result.scheduledCount} placed, ${result.unscheduledCount} unscheduled.`,
        );
      } else {
        toast.success(`Regenerated schedule: ${result.scheduledCount} matchups placed.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to regenerate schedule");
    }
  }, [isDirty, refetch, regenerateScheduleAsync, seasonId]);

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
    const eventNumber = events.length + 1;
    setEvents((prev) => [...prev, createNewEvent(`Event ${eventNumber}`, today)]);
    markDirty();
  }, [events.length, markDirty]);

  const handleDeleteEvent = useCallback(
    (eventId: string) => {
      setEvents((prev) => {
        const event = prev.find((e) => e.id === eventId);
        if (!event) return prev;

        // Move all matchups from this event back to unscheduled
        const matchupsToReturn: Matchup[] = [];
        event.courts.forEach((court) => {
          court.slots.forEach((slot) => {
            if (slot.matchup) {
              matchupsToReturn.push(slot.matchup);
            }
          });
        });

        if (matchupsToReturn.length > 0) {
          setUnscheduledMatchups((um) => [...um, ...matchupsToReturn]);
        }

        return prev.filter((e) => e.id !== eventId);
      });
      markDirty();
    },
    [markDirty],
  );

  const handleUpdateEvent = useCallback(
    (eventId: string, updates: Partial<Pick<ScheduleEvent, "name" | "date">>) => {
      setEvents((prev) =>
        prev.map((event) => (event.id === eventId ? { ...event, ...updates } : event)),
      );
      markDirty();
    },
    [markDirty],
  );

  const handleAddSlot = useCallback(
    (eventId: string) => {
      setEvents((prev) =>
        prev.map((event) => {
          if (event.id !== eventId) return event;

          const maxSlots = Math.max(
            event.courts[0].slots.length,
            event.courts[1].slots.length,
          );

          return {
            ...event,
            courts: event.courts.map((court) => ({
              ...court,
              slots: [
                ...court.slots,
                {
                  id: `slot-${maxSlots}`,
                  time: getTimeForSlotIndex(maxSlots),
                  matchup: null,
                },
              ],
            })) as [(typeof event.courts)[0], (typeof event.courts)[1]],
          };
        }),
      );
      markDirty();
    },
    [markDirty],
  );

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const dragData = event.active.data.current as DragData;
    if (dragData?.type === "matchup") {
      setActiveMatchup(dragData.matchup);
    }
  }, []);

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
          setEvents((prev) =>
            prev.map((evt) => {
              if (evt.id !== source.eventId) return evt;
              return {
                ...evt,
                courts: evt.courts.map((court) => {
                  if (court.id !== source.courtId) return court;
                  return {
                    ...court,
                    slots: court.slots.map((slot) => {
                      if (slot.id !== source.slotId) return slot;
                      return { ...slot, matchup: null };
                    }),
                  };
                }) as [(typeof evt.courts)[0], (typeof evt.courts)[1]],
              };
            }),
          );
          setUnscheduledMatchups((prev) => [...prev, matchup]);
          markDirty();
        }
        return;
      }

      // Handle dropping on a slot
      if (dropData?.type === "slot") {
        const { eventId, courtId, slotId } = dropData;

        const targetEvent = events.find((e) => e.id === eventId);
        const targetCourt = targetEvent?.courts.find((c) => c.id === courtId);
        const targetSlot = targetCourt?.slots.find((s) => s.id === slotId);
        const targetSlotIndex = targetCourt?.slots.findIndex((s) => s.id === slotId) ?? -1;

        if (!targetEvent || targetSlotIndex < 0) return;
        if (targetSlot?.matchup) return;

        if (isDateUnavailable(matchup.teamA.unavailableDates ?? "", targetEvent.date)) {
          toast.error(`${matchup.teamA.name} is unavailable on ${targetEvent.date}`);
          return;
        }

        if (isDateUnavailable(matchup.teamB.unavailableDates ?? "", targetEvent.date)) {
          toast.error(`${matchup.teamB.name} is unavailable on ${targetEvent.date}`);
          return;
        }

        const scheduledInEvent = targetEvent.courts.flatMap((court) =>
          court.slots.flatMap((slot, slotIndex) => {
            if (!slot.matchup || slot.matchup.id === matchup.id) {
              return [];
            }
            return [{ matchup: slot.matchup, slotIndex }];
          }),
        );

        const slotConflict = scheduledInEvent.find(
          (scheduled) =>
            scheduled.slotIndex === targetSlotIndex &&
            teamsOverlap(
              matchup.teamA.id,
              matchup.teamB.id,
              scheduled.matchup.teamA.id,
              scheduled.matchup.teamB.id,
            ),
        );
        if (slotConflict) {
          toast.error("A team cannot play two matches at the same time.");
          return;
        }

        const teamAGamesInEvent =
          scheduledInEvent.filter(
            (scheduled) =>
              scheduled.matchup.teamA.id === matchup.teamA.id ||
              scheduled.matchup.teamB.id === matchup.teamA.id,
          ).length + 1;
        if (teamAGamesInEvent > MAX_GAMES_PER_EVENT) {
          toast.error(`A team can only play ${MAX_GAMES_PER_EVENT} games per event.`);
          return;
        }

        const teamBGamesInEvent =
          scheduledInEvent.filter(
            (scheduled) =>
              scheduled.matchup.teamA.id === matchup.teamB.id ||
              scheduled.matchup.teamB.id === matchup.teamB.id,
          ).length + 1;
        if (teamBGamesInEvent > MAX_GAMES_PER_EVENT) {
          toast.error(`A team can only play ${MAX_GAMES_PER_EVENT} games per event.`);
          return;
        }

        if (source.type === "unscheduled") {
          setUnscheduledMatchups((prev) => prev.filter((m) => m.id !== matchup.id));
        } else {
          setEvents((prev) =>
            prev.map((evt) => {
              if (evt.id !== source.eventId) return evt;
              return {
                ...evt,
                courts: evt.courts.map((court) => {
                  if (court.id !== source.courtId) return court;
                  return {
                    ...court,
                    slots: court.slots.map((slot) => {
                      if (slot.id !== source.slotId) return slot;
                      return { ...slot, matchup: null };
                    }),
                  };
                }) as [(typeof evt.courts)[0], (typeof evt.courts)[1]],
              };
            }),
          );
        }

        setEvents((prev) =>
          prev.map((evt) => {
            if (evt.id !== eventId) return evt;
            return {
              ...evt,
              courts: evt.courts.map((court) => {
                if (court.id !== courtId) return court;
                return {
                  ...court,
                  slots: court.slots.map((slot) => {
                    if (slot.id !== slotId) return slot;
                    return { ...slot, matchup };
                  }),
                };
              }) as [(typeof evt.courts)[0], (typeof evt.courts)[1]],
            };
          }),
        );
        markDirty();
      }
    },
    [events, markDirty],
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
        <UnscheduledPanel
          matchups={unscheduledMatchups}
          matchupsByCategory={initialState.matchupsByCategory}
        />

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
            {events.length === 0 ? (
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
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onAddSlot={handleAddSlot}
                    onDeleteEvent={handleDeleteEvent}
                    onUpdateEvent={handleUpdateEvent}
                  />
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
