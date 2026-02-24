import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { memo, useMemo } from "react";
import { cn } from "~/lib/utils";
import type { DragData, Matchup } from "./types";

type MatchupBlockProps = {
  matchup: Matchup;
  source: DragData["source"];
  isOverlay?: boolean;
};

const categoryColorCache = new Map<
  string,
  { bg: string; border: string; text: string }
>();

function getCategoryColor(category: string) {
  const cached = categoryColorCache.get(category);
  if (cached) {
    return cached;
  }
  // Generate consistent colors based on category name hash
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

  // Simple hash function to get consistent color
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const selected = colors[Math.abs(hash) % colors.length];
  categoryColorCache.set(category, selected);
  return selected;
}

export const MatchupBlock = memo(function MatchupBlock({
  matchup,
  source,
  isOverlay,
}: MatchupBlockProps) {
  const dragData: DragData = useMemo(
    () => ({
      type: "matchup",
      matchup,
      source,
    }),
    [matchup, source],
  );

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `matchup-${matchup.id}-${source.type === "unscheduled" ? "unscheduled" : `${source.eventId}-${source.courtId}-${source.slotId}`}`,
    data: dragData,
  });

  const colors = useMemo(() => getCategoryColor(matchup.category), [matchup.category]);
  const draggableAttributes = useMemo(() => {
    const nextAttributes = { ...attributes };
    delete (nextAttributes as { tabIndex?: number }).tabIndex;
    return nextAttributes;
  }, [attributes]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all select-none",
        colors.bg,
        colors.border,
        isDragging && !isOverlay && "opacity-40",
        isOverlay && "ring-primary/50 scale-105 rotate-2 shadow-xl ring-2",
        !isOverlay && "cursor-grab hover:shadow-md active:cursor-grabbing",
      )}
      {...listeners}
      {...draggableAttributes}
    >
      <GripVertical className="text-muted-foreground/50 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-sm font-medium", colors.text)}>
          {matchup.teamA.name}
        </div>
        <div className="text-muted-foreground my-0.5 text-xs">vs</div>
        <div className={cn("truncate text-sm font-medium", colors.text)}>
          {matchup.teamB.name}
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
        <div className={cn("truncate text-sm font-medium", colors.text)}>
          {matchup.teamA.name}
        </div>
        <div className="text-muted-foreground my-0.5 text-xs">vs</div>
        <div className={cn("truncate text-sm font-medium", colors.text)}>
          {matchup.teamB.name}
        </div>
      </div>
    </div>
  );
});
