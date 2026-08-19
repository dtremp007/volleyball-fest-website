import {
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { Counter } from "~/components/counter";
import {
  clampGamesPerTeam,
  gamesPerTeamHelperText,
  maxGamesPerTeam,
  minGamesPerTeam,
  nextGamesPerTeam,
} from "~/lib/schedule/games-per-team";
import { cn } from "~/lib/utils";
import { GROUP_NAMES, type ConfigureTeam } from "./category-state";

export type TeamDragData = {
  type: "team";
  team: ConfigureTeam;
  categoryId: string;
  fromGroupIndex: number;
};

export type GroupDropData = {
  type: "group";
  categoryId: string;
  groupIndex: number;
};

export function readTeamDrop(event: DragEndEvent) {
  const dragData = event.active.data.current as TeamDragData | undefined;
  const dropData = event.over?.data.current as GroupDropData | undefined;
  if (!dragData || dragData.type !== "team") return null;
  if (!dropData || dropData.type !== "group") return null;
  if (dragData.categoryId !== dropData.categoryId) return null;
  if (dragData.fromGroupIndex === dropData.groupIndex) return null;
  return { team: dragData.team, groupIndex: dropData.groupIndex };
}

export function readDragStartTeam(event: DragStartEvent) {
  const dragData = event.active.data.current as TeamDragData | undefined;
  return dragData?.type === "team" ? dragData.team : null;
}

export function readOverGroupId(event: DragOverEvent) {
  return event.over?.id?.toString() ?? null;
}

function DraggableTeamCard({
  team,
  categoryId,
  groupIndex,
}: {
  team: ConfigureTeam;
  categoryId: string;
  groupIndex: number;
}) {
  const dragData: TeamDragData = {
    type: "team",
    team,
    categoryId,
    fromGroupIndex: groupIndex,
  };

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `team-${team.id}`,
    data: dragData,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group bg-card flex items-center gap-2 rounded-lg border px-3 py-2 transition-all select-none",
        isDragging && "opacity-40",
        !isDragging && "cursor-grab hover:shadow-md active:cursor-grabbing",
      )}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="text-muted-foreground/50 size-4 shrink-0" />
      {team.logoUrl && (
        <img src={team.logoUrl} alt="" className="size-6 rounded-full object-cover" />
      )}
      <span className="truncate text-sm font-medium">{team.name}</span>
    </div>
  );
}

export function TeamCardOverlay({ team }: { team: ConfigureTeam }) {
  return (
    <div className="border-primary bg-card ring-primary/50 flex scale-105 rotate-2 items-center gap-2 rounded-lg border-2 px-3 py-2 shadow-2xl ring-2">
      <GripVertical className="text-muted-foreground/50 size-4 shrink-0" />
      {team.logoUrl && (
        <img src={team.logoUrl} alt="" className="size-6 rounded-full object-cover" />
      )}
      <span className="truncate text-sm font-medium">{team.name}</span>
    </div>
  );
}

export function GroupDropZone({
  categoryId,
  groupIndex,
  teams,
  isOver,
  gamesPerTeam,
  onGamesPerTeamChange,
}: {
  categoryId: string;
  groupIndex: number;
  teams: ConfigureTeam[];
  isOver: boolean;
  gamesPerTeam: number;
  onGamesPerTeamChange: (value: number) => void;
}) {
  const dropData: GroupDropData = {
    type: "group",
    categoryId,
    groupIndex,
  };

  const { setNodeRef } = useDroppable({
    id: `group-${categoryId}-${groupIndex}`,
    data: dropData,
  });

  const teamCount = teams.length;
  const min = minGamesPerTeam(teamCount);
  const max = maxGamesPerTeam(teamCount);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[180px] flex-1 rounded-lg border-2 border-dashed p-3 transition-colors",
        isOver ? "border-primary bg-primary/5" : "border-muted-foreground/20 bg-muted/30",
      )}
    >
      <h4 className="mb-3 text-center text-sm font-semibold">
        Group {GROUP_NAMES[groupIndex]}
      </h4>
      <div className="mb-3 space-y-1">
        <Counter
          id={`games-${categoryId}-${groupIndex}`}
          name={`games-${categoryId}-${groupIndex}`}
          label="Games per team"
          value={gamesPerTeam}
          onChange={onGamesPerTeamChange}
          min={min}
          max={max}
          disabled={teamCount < 2}
          getNext={(current) => nextGamesPerTeam(teamCount, current, 1)}
          getPrev={(current) => nextGamesPerTeam(teamCount, current, -1)}
        />
        <p className="text-muted-foreground text-xs">
          {gamesPerTeamHelperText(teamCount, clampGamesPerTeam(teamCount, gamesPerTeam))}
        </p>
      </div>
      <div className="min-h-[60px] space-y-2">
        {teams.map((team) => (
          <DraggableTeamCard
            key={team.id}
            team={team}
            categoryId={categoryId}
            groupIndex={groupIndex}
          />
        ))}
        {teams.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-xs">
            Drop teams here
          </p>
        )}
      </div>
    </div>
  );
}
