import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GripVertical, Loader2, Sparkles } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Counter } from "~/components/counter";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { useTRPC } from "~/trpc/react";

export const Route = createFileRoute("/(authenticated)/seasons/$seasonId/configure")({
  component: ConfigurePage,
  loader: async ({ params, context }) => {
    const [categories, teams, season, groups] = await Promise.all([
      context.queryClient.fetchQuery(context.trpc.category.getAll.queryOptions()),
      context.queryClient.fetchQuery(
        context.trpc.team.list.queryOptions({ seasonId: params.seasonId }),
      ),
      context.queryClient.fetchQuery(
        context.trpc.season.getById.queryOptions({ id: params.seasonId }),
      ),
      context.queryClient.fetchQuery(
        context.trpc.group.listForSeason.queryOptions({ seasonId: params.seasonId }),
      ),
    ]);

    return { categories, teams, season, groups };
  },
});

// Types
type Team = {
  id: string;
  name: string;
  logoUrl: string;
  category: { id: string; name: string };
  groupId?: string | null;
};

type GroupAssignment = {
  // Maps teamId -> groupIndex (0, 1, 2, 3 for A, B, C, D)
  [teamId: string]: number;
};

type CategoryState = {
  groupCount: number;
  assignments: GroupAssignment;
};

type DragData = {
  type: "team";
  team: Team;
  categoryId: string;
  fromGroupIndex: number;
};

type DropData = {
  type: "group";
  categoryId: string;
  groupIndex: number;
};

// Group names
const GROUP_NAMES = ["A", "B", "C", "D"];

// Auto-distribute teams evenly across groups
function distributeTeams(teams: Team[], groupCount: number): GroupAssignment {
  const assignments: GroupAssignment = {};
  teams.forEach((team, index) => {
    assignments[team.id] = index % groupCount;
  });
  return assignments;
}

// Build initial category state from existing groups and team assignments
function buildInitialCategoryStates(
  categories: { id: string }[],
  teams: Team[],
  groups: { id: string; name: string; categoryId: string }[],
): Record<string, CategoryState> {
  const initial: Record<string, CategoryState> = {};
  const teamsByCategory = new Map<string, Team[]>();
  teams.forEach((team) => {
    const categoryId = team.category.id;
    if (!teamsByCategory.has(categoryId)) {
      teamsByCategory.set(categoryId, []);
    }
    teamsByCategory.get(categoryId)!.push(team);
  });

  const groupsByCategory = new Map<string, typeof groups>();
  groups.forEach((g) => {
    if (!groupsByCategory.has(g.categoryId)) {
      groupsByCategory.set(g.categoryId, []);
    }
    groupsByCategory.get(g.categoryId)!.push(g);
  });

  categories.forEach((cat) => {
    const catTeams = teamsByCategory.get(cat.id) || [];
    const catGroups = groupsByCategory.get(cat.id) || [];

    if (catGroups.length > 0) {
      const groupIdToIndex = new Map<string, number>();
      catGroups.forEach((g, i) => groupIdToIndex.set(g.id, i));
      const assignments: GroupAssignment = {};
      catTeams.forEach((team) => {
        const groupIndex =
          team.groupId != null ? (groupIdToIndex.get(team.groupId) ?? 0) : 0;
        assignments[team.id] = groupIndex;
      });
      initial[cat.id] = {
        groupCount: catGroups.length,
        assignments,
      };
    } else {
      initial[cat.id] = {
        groupCount: 1,
        assignments: distributeTeams(catTeams, 1),
      };
    }
  });

  return initial;
}

// Draggable Team Card Component
function DraggableTeamCard({
  team,
  categoryId,
  groupIndex,
}: {
  team: Team;
  categoryId: string;
  groupIndex: number;
}) {
  const dragData: DragData = {
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

// Team Card Overlay (shown during drag)
function TeamCardOverlay({ team }: { team: Team }) {
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

// Droppable Group Column Component
function GroupDropZone({
  categoryId,
  groupIndex,
  groupName,
  teams,
  isOver,
}: {
  categoryId: string;
  groupIndex: number;
  groupName: string;
  teams: Team[];
  isOver: boolean;
}) {
  const dropData: DropData = {
    type: "group",
    categoryId,
    groupIndex,
  };

  const { setNodeRef } = useDroppable({
    id: `group-${categoryId}-${groupIndex}`,
    data: dropData,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[140px] flex-1 rounded-lg border-2 border-dashed p-3 transition-colors",
        isOver ? "border-primary bg-primary/5" : "border-muted-foreground/20 bg-muted/30",
      )}
    >
      <h4 className="mb-3 text-center text-sm font-semibold">Group {groupName}</h4>
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

function ConfigurePage() {
  const { seasonId } = Route.useParams();
  const { categories, teams, season, groups } = Route.useLoaderData();
  const navigate = useNavigate();
  const trpc = useTRPC();

  // Group teams by category
  const teamsByCategory = useMemo(() => {
    const map = new Map<string, Team[]>();
    teams.forEach((team) => {
      const categoryId = team.category.id;
      if (!map.has(categoryId)) {
        map.set(categoryId, []);
      }
      map.get(categoryId)!.push(team);
    });
    return map;
  }, [teams]);

  // Initialize state from existing groups or auto-distribute
  const [categoryStates, setCategoryStates] = useState<Record<string, CategoryState>>(
    () => buildInitialCategoryStates(categories, teams, groups),
  );

  // Track active drag for overlay
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);

  // Track which group is being hovered
  const [overGroupId, setOverGroupId] = useState<string | null>(null);

  // DnD sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  // Handle group count change with auto-redistribution
  const handleGroupCountChange = useCallback(
    (categoryId: string, newCount: number) => {
      const catTeams = teamsByCategory.get(categoryId) || [];
      setCategoryStates((prev) => ({
        ...prev,
        [categoryId]: {
          groupCount: newCount,
          assignments: distributeTeams(catTeams, newCount),
        },
      }));
    },
    [teamsByCategory],
  );

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const dragData = event.active.data.current as DragData;
    if (dragData?.type === "team") {
      setActiveTeam(dragData.team);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverGroupId(event.over?.id?.toString() ?? null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTeam(null);
    setOverGroupId(null);

    const { active, over } = event;
    if (!over) return;

    const dragData = active.data.current as DragData;
    const dropData = over.data.current as DropData;

    if (!dragData || dragData.type !== "team") return;
    if (!dropData || dropData.type !== "group") return;

    // Only allow drops within the same category
    if (dragData.categoryId !== dropData.categoryId) return;

    // Skip if dropping on same group
    if (dragData.fromGroupIndex === dropData.groupIndex) return;

    const { team, categoryId } = dragData;
    const { groupIndex: toGroupIndex } = dropData;

    // Update assignments
    setCategoryStates((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        assignments: {
          ...prev[categoryId].assignments,
          [team.id]: toGroupIndex,
        },
      },
    }));
  }, []);

  // Single mutation for saving groups and generating matchups
  const generateWithGroupsMutation = useMutation(
    trpc.matchup.generateWithGroups.mutationOptions(),
  );

  // Handle Generate Matchups - one-shot save and generate
  const handleGenerateMatchups = async () => {
    // Build the category configs payload
    const categoryConfigs = categories
      .map((category) => {
        const state = categoryStates[category.id];
        if (!state) return null;

        const catTeams = teamsByCategory.get(category.id) || [];
        if (catTeams.length === 0) return null;

        // Group teams by their assigned group index
        const groupsMap: Record<number, string[]> = {};
        for (let i = 0; i < state.groupCount; i++) {
          groupsMap[i] = [];
        }
        catTeams.forEach((team) => {
          const groupIndex = state.assignments[team.id] ?? 0;
          groupsMap[groupIndex]?.push(team.id);
        });

        // Convert to array format
        const groups = Object.entries(groupsMap).map(([index, teamIds]) => ({
          name: GROUP_NAMES[Number(index)],
          teamIds,
        }));

        return {
          categoryId: category.id,
          groups,
        };
      })
      .filter((config): config is NonNullable<typeof config> => config !== null);

    try {
      const result = await generateWithGroupsMutation.mutateAsync({
        seasonId,
        categoryConfigs,
      });

      toast.success(`Generated ${result.matchupsGenerated} matchups!`);

      // Navigate to generate page (for scheduling dates)
      navigate({
        to: "/seasons/$seasonId/generate",
        params: { seasonId },
      });
    } catch (error) {
      console.error("Failed to generate matchups:", error);
      toast.error("Failed to generate matchups");
    }
  };

  // Check if there are any teams to configure
  const hasTeams = categories.some((c) => (teamsByCategory.get(c.id) || []).length > 0);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Configure Teams & Groups
          </h2>
          <p className="text-muted-foreground mt-2">
            Set up teams and groups for {season.name}. Drag teams between groups to
            organize them.
          </p>
        </div>

        <div className="space-y-6">
          {categories.map((category) => {
            const catTeams = teamsByCategory.get(category.id) || [];
            const state = categoryStates[category.id] || {
              groupCount: 1,
              assignments: {},
            };

            if (catTeams.length === 0) {
              return (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle>{category.name}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground py-4 text-center text-sm">
                      No teams in this category
                    </p>
                  </CardContent>
                </Card>
              );
            }

            // Group teams by their assigned group index
            const teamsByGroup: Team[][] = Array.from(
              { length: state.groupCount },
              () => [],
            );
            catTeams.forEach((team) => {
              const groupIndex = state.assignments[team.id] ?? 0;
              if (teamsByGroup[groupIndex]) {
                teamsByGroup[groupIndex].push(team);
              }
            });

            return (
              <Card key={category.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{category.name}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {catTeams.length} team{catTeams.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Group Count Counter */}
                  <Counter
                    id={`groups-${category.id}`}
                    name={`groups-${category.id}`}
                    label="Number of Groups"
                    value={state.groupCount}
                    onChange={(count) => handleGroupCountChange(category.id, count)}
                    min={1}
                    max={4}
                  />

                  {/* Group Columns */}
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {Array.from({ length: state.groupCount }, (_, i) => (
                      <GroupDropZone
                        key={i}
                        categoryId={category.id}
                        groupIndex={i}
                        groupName={GROUP_NAMES[i]}
                        teams={teamsByGroup[i] || []}
                        isOver={overGroupId === `group-${category.id}-${i}`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {hasTeams && (
          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleGenerateMatchups}
              size="lg"
              disabled={generateWithGroupsMutation.isPending}
            >
              {generateWithGroupsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Generate Matchups
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeTeam ? <TeamCardOverlay team={activeTeam} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
