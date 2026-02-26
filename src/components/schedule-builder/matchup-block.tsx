import { useDraggable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Car, GripVertical } from "lucide-react";
import { memo, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { isDateUnavailable, normalizeDateOnly } from "~/lib/unavailable-dates";
import { cn } from "~/lib/utils";
import { useScheduleStore } from "./store";
import type { DragData, Matchup } from "./types";
import { getConflictingTeams } from "./utils";

const categoryColorCache = new Map<
  string,
  { bg: string; border: string; text: string }
>();

function getCategoryColor(category: string) {
  const cached = categoryColorCache.get(category);
  if (cached) {
    return cached;
  }
  const colors = [
    {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-300 dark:border-amber-700",
      text: "text-amber-800 dark:text-amber-200",
    },
    {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-300 dark:border-emerald-700",
      text: "text-emerald-800 dark:text-emerald-200",
    },
    {
      bg: "bg-sky-50 dark:bg-sky-950/30",
      border: "border-sky-300 dark:border-sky-700",
      text: "text-sky-800 dark:text-sky-200",
    },
    {
      bg: "bg-violet-50 dark:bg-violet-950/30",
      border: "border-violet-300 dark:border-violet-700",
      text: "text-violet-800 dark:text-violet-200",
    },
    {
      bg: "bg-rose-50 dark:bg-rose-950/30",
      border: "border-rose-300 dark:border-rose-700",
      text: "text-rose-800 dark:text-rose-200",
    },
    {
      bg: "bg-cyan-50 dark:bg-cyan-950/30",
      border: "border-cyan-300 dark:border-cyan-700",
      text: "text-cyan-800 dark:text-cyan-200",
    },
  ];

  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const selected = colors[Math.abs(hash) % colors.length];
  categoryColorCache.set(category, selected);
  return selected;
}

type MatchupBlockProps = {
  matchupId: string;
  eventId: string;
  courtId: "A" | "B";
  index: number;
};

export const MatchupBlock = memo(function MatchupBlock({
  matchupId,
  eventId,
  courtId,
  index,
}: MatchupBlockProps) {
  const matchup = useScheduleStore((state) => {
    const event = state.events.find((e) => e.id === eventId);
    const court = event?.courts.find((c) => c.id === courtId);
    return court?.matchups[index];
  });
  const eventDate = useScheduleStore(
    (state) => state.events.find((e) => e.id === eventId)?.date ?? "",
  );

  const conflictingTeams = useScheduleStore(
    useShallow((state) => {
      const event = state.events.find((e) => e.id === eventId);
      if (!event) return [];
      return getConflictingTeams(event, courtId, index);
    }),
  );

  const dragData: DragData = useMemo(
    () => ({
      type: "matchup" as const,
      matchup: matchup!,
      source: { type: "scheduled" as const, eventId, courtId, index },
    }),
    [matchup, eventId, courtId, index],
  );

  const sortableId = `matchup-${matchupId}-${eventId}-${courtId}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    data: dragData,
  });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
    }),
    [transform, transition],
  );

  if (!matchup) return null;

  const colors = getCategoryColor(matchup.category);
  const hasConflict = conflictingTeams.length > 0;
  const unavailableTeams = [matchup.teamA, matchup.teamB]
    .filter((team) => isDateUnavailable(team.unavailableDates ?? "", eventDate))
    .map((team) => team.name);
  const hasUnavailableDateConflict = unavailableTeams.length > 0;
  const hasWarning = hasConflict || hasUnavailableDateConflict;
  const eventDateLabel = normalizeDateOnly(eventDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-shadow select-none",
        colors.bg,
        colors.border,
        isDragging && "z-10 opacity-40",
        !isDragging && "cursor-grab hover:shadow-md active:cursor-grabbing",
      )}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="text-muted-foreground/50 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className={cn("flex items-center gap-1.5 truncate text-sm font-medium", colors.text)}>
          {matchup.teamA.name}
          {matchup.teamA.isFarAway && (
            <span title="Far away team"><Car className="size-3.5 shrink-0" /></span>
          )}
        </div>
        <div className="text-muted-foreground my-0.5 text-xs">vs</div>
        <div className={cn("flex items-center gap-1.5 truncate text-sm font-medium", colors.text)}>
          {matchup.teamB.name}
          {matchup.teamB.isFarAway && (
            <span title="Far away team"><Car className="size-3.5 shrink-0" /></span>
          )}
        </div>
      </div>
      {hasWarning && (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertTriangle className="size-4 shrink-0 text-amber-500" />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-1">
              {hasConflict && (
                <p>
                  {conflictingTeams.join(", ")} also playing on Court{" "}
                  {courtId === "A" ? "B" : "A"} at this time
                </p>
              )}
              {hasUnavailableDateConflict && (
                <p>
                  {unavailableTeams.join(", ")} unavailable on{" "}
                  {eventDateLabel || "this event date"}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
});

type UnscheduledMatchupBlockProps = {
  matchup: Matchup;
};

export const UnscheduledMatchupBlock = memo(function UnscheduledMatchupBlock({
  matchup,
}: UnscheduledMatchupBlockProps) {
  const dragData: DragData = useMemo(
    () => ({
      type: "matchup" as const,
      matchup,
      source: { type: "unscheduled" as const },
    }),
    [matchup],
  );

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `matchup-${matchup.id}-unscheduled`,
    data: dragData,
  });

  const colors = useMemo(() => getCategoryColor(matchup.category), [matchup.category]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all select-none",
        colors.bg,
        colors.border,
        isDragging && "opacity-40",
        "cursor-grab hover:shadow-md active:cursor-grabbing",
      )}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="text-muted-foreground/50 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className={cn("flex items-center gap-1.5 truncate text-sm font-medium", colors.text)}>
          {matchup.teamA.name}
          {matchup.teamA.isFarAway && (
            <span title="Far away team"><Car className="size-3.5 shrink-0" /></span>
          )}
        </div>
        <div className="text-muted-foreground my-0.5 text-xs">vs</div>
        <div className={cn("flex items-center gap-1.5 truncate text-sm font-medium", colors.text)}>
          {matchup.teamB.name}
          {matchup.teamB.isFarAway && (
            <span title="Far away team"><Car className="size-3.5 shrink-0" /></span>
          )}
        </div>
      </div>
    </div>
  );
});

export const MatchupBlockOverlay = memo(function MatchupBlockOverlay({
  matchup,
}: {
  matchup: Matchup;
}) {
  const colors = useMemo(() => getCategoryColor(matchup.category), [matchup.category]);

  return (
    <div
      className={cn(
        "flex scale-105 rotate-2 items-center gap-2 rounded-lg border-2 px-3 py-2 shadow-2xl",
        colors.bg,
        colors.border,
        "ring-primary/50 ring-2",
      )}
    >
      <GripVertical className="text-muted-foreground/50 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className={cn("flex items-center gap-1.5 truncate text-sm font-medium", colors.text)}>
          {matchup.teamA.name}
          {matchup.teamA.isFarAway && (
            <span title="Far away team"><Car className="size-3.5 shrink-0" /></span>
          )}
        </div>
        <div className="text-muted-foreground my-0.5 text-xs">vs</div>
        <div className={cn("flex items-center gap-1.5 truncate text-sm font-medium", colors.text)}>
          {matchup.teamB.name}
          {matchup.teamB.isFarAway && (
            <span title="Far away team"><Car className="size-3.5 shrink-0" /></span>
          )}
        </div>
      </div>
    </div>
  );
});
