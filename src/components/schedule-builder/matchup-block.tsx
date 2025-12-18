import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { cn } from "~/lib/utils";
import type { DragData, Matchup } from "./types";

type MatchupBlockProps = {
  matchup: Matchup;
  source: DragData["source"];
  isOverlay?: boolean;
};

// Category color mapping for visual distinction
const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  default: {
    bg: "bg-slate-50 dark:bg-slate-900/50",
    border: "border-slate-200 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
  },
};

function getCategoryColor(category: string) {
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
  return colors[Math.abs(hash) % colors.length];
}

export function MatchupBlock({ matchup, source, isOverlay }: MatchupBlockProps) {
  const dragData: DragData = {
    type: "matchup",
    matchup,
    source,
  };

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `matchup-${matchup.id}-${source.type === "unscheduled" ? "unscheduled" : `${source.eventId}-${source.courtId}-${source.slotId}`}`,
    data: dragData,
  });

  const colors = getCategoryColor(matchup.category);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all select-none",
        colors.bg,
        colors.border,
        isDragging && !isOverlay && "opacity-40",
        isOverlay && "shadow-xl ring-2 ring-primary/50 rotate-2 scale-105",
        !isOverlay && "hover:shadow-md cursor-grab active:cursor-grabbing",
      )}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="size-4 text-muted-foreground/50 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium truncate", colors.text)}>
          {matchup.teamA.name}
        </div>
        <div className="text-xs text-muted-foreground my-0.5">vs</div>
        <div className={cn("text-sm font-medium truncate", colors.text)}>
          {matchup.teamB.name}
        </div>
      </div>
    </div>
  );
}

export function MatchupBlockOverlay({ matchup }: { matchup: Matchup }) {
  const colors = getCategoryColor(matchup.category);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border-2 px-3 py-2 shadow-2xl rotate-2 scale-105",
        colors.bg,
        colors.border,
        "ring-2 ring-primary/50",
      )}
    >
      <GripVertical className="size-4 text-muted-foreground/50 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium truncate", colors.text)}>
          {matchup.teamA.name}
        </div>
        <div className="text-xs text-muted-foreground my-0.5">vs</div>
        <div className={cn("text-sm font-medium truncate", colors.text)}>
          {matchup.teamB.name}
        </div>
      </div>
    </div>
  );
}
