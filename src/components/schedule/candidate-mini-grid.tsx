import { useMemo } from "react";
import { DEFAULT_CATEGORY_COLOR, normalizeCategoryColor } from "~/lib/category-color";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/router";

type DraftPlacement =
  RouterOutputs["scheduleDraft"]["list"][number]["placements"][number];

type CategoryOption = {
  id: string;
  name: string;
  color: string;
};

type EventOption = {
  id: string;
  name: string;
};

type CandidateMiniGridProps = {
  events: EventOption[];
  placements: DraftPlacement[];
  categories: CategoryOption[];
  gamesPerEvening: number;
};

const COURTS = ["A", "B"] as const;

function contrastText(hex: string) {
  const normalized = normalizeCategoryColor(hex) ?? DEFAULT_CATEGORY_COLOR;
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#111827" : "#ffffff";
}

function placementKey(eventId: string, courtId: string, slotIndex: number) {
  return `${eventId}:${courtId}:${slotIndex}`;
}

export function CandidateMiniGrid({
  events,
  placements,
  categories,
  gamesPerEvening,
}: CandidateMiniGridProps) {
  const categoryById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const slotCount = useMemo(() => {
    const maxSlot = placements.reduce(
      (max, placement) => Math.max(max, placement.slotIndex),
      -1,
    );
    return Math.max(gamesPerEvening, maxSlot + 1, 1);
  }, [gamesPerEvening, placements]);

  const rows = useMemo(() => {
    const seen = new Set(events.map((event) => event.id));
    const extra: EventOption[] = [];
    for (const placement of placements) {
      if (!seen.has(placement.eventId)) {
        seen.add(placement.eventId);
        extra.push({ id: placement.eventId, name: "Untitled event" });
      }
    }
    return extra.length > 0 ? [...events, ...extra] : events;
  }, [events, placements]);

  const placementByCell = useMemo(() => {
    const map = new Map<string, DraftPlacement>();
    for (const placement of placements) {
      map.set(
        placementKey(placement.eventId, placement.courtId, placement.slotIndex),
        placement,
      );
    }
    return map;
  }, [placements]);

  const slots = useMemo(
    () => Array.from({ length: slotCount }, (_, index) => index),
    [slotCount],
  );

  if (rows.length === 0) {
    return <p className="text-muted-foreground text-xs">No events to preview yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-max border-separate border-spacing-px text-[10px] leading-none">
        <caption className="sr-only">Mini schedule by event, court, and slot</caption>
        <thead>
          <tr>
            <th className="bg-card sticky left-0 z-10 min-w-20 p-0" />
            {COURTS.map((court) => (
              <th
                key={court}
                colSpan={slotCount}
                className="text-muted-foreground pb-1 text-center font-medium"
              >
                Court {court}
              </th>
            ))}
          </tr>
          <tr>
            <th className="bg-card sticky left-0 z-10 min-w-20 p-0" />
            {COURTS.map((court) =>
              slots.map((slot) => (
                <th
                  key={`${court}-${slot}`}
                  className="text-muted-foreground w-5 pb-0.5 text-center font-normal tabular-nums"
                >
                  {slot + 1}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((event) => (
            <tr key={event.id}>
              <th
                className="bg-card text-muted-foreground sticky left-0 z-10 max-w-24 truncate pr-2 text-left font-medium"
                title={event.name}
              >
                {event.name}
              </th>
              {COURTS.map((court) =>
                slots.map((slot) => {
                  const placement = placementByCell.get(
                    placementKey(event.id, court, slot),
                  );
                  const category = placement?.categoryId
                    ? categoryById.get(placement.categoryId)
                    : undefined;
                  const color = category
                    ? (normalizeCategoryColor(category.color) ?? DEFAULT_CATEGORY_COLOR)
                    : undefined;
                  const letter = category?.name.charAt(0).toUpperCase() ?? "";

                  return (
                    <td key={`${event.id}-${court}-${slot}`} className="p-0">
                      <div
                        title={
                          category
                            ? `${category.name} · Court ${court} · Slot ${slot + 1}`
                            : `Empty · Court ${court} · Slot ${slot + 1}`
                        }
                        className={cn(
                          "flex size-5 items-center justify-center rounded-[3px] font-semibold",
                          !placement && "bg-muted",
                          placement && !category && "bg-muted-foreground/30",
                        )}
                        style={
                          color
                            ? { backgroundColor: color, color: contrastText(color) }
                            : undefined
                        }
                      >
                        {letter}
                      </div>
                    </td>
                  );
                }),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
