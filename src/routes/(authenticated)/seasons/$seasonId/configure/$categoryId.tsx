import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  buildInitialCategoryState,
  GROUP_NAMES,
  teamsInGroup,
  withGamesPerTeam,
  withGroupCount,
  withTeamAssignment,
  type CategoryConfigState,
  type ConfigureTeam,
} from "~/components/configure/category-state";
import {
  GroupDropZone,
  readDragStartTeam,
  readOverGroupId,
  readTeamDrop,
  TeamCardOverlay,
} from "~/components/configure/group-board";
import { Counter } from "~/components/counter";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useTRPC } from "~/trpc/react";
import { GROUP_COUNT_MAX, GROUP_COUNT_MIN } from "~/validators/group.validators";
import { Route as ConfigureLayoutRoute } from "./route";

export const Route = createFileRoute(
  "/(authenticated)/seasons/$seasonId/configure/$categoryId",
)({
  component: ConfigureCategoryPage,
  loader: async ({ params, context }) => {
    const categories = await context.queryClient.fetchQuery(
      context.trpc.category.getAll.queryOptions(),
    );
    if (!categories.some((category) => category.id === params.categoryId)) {
      throw redirect({
        to: "/seasons/$seasonId/configure",
        params: { seasonId: params.seasonId },
      });
    }
  },
});

function ConfigureCategoryPage() {
  const { seasonId, categoryId } = Route.useParams();
  const { categories, teams, groups, matchups } = ConfigureLayoutRoute.useLoaderData();
  const category = categories.find((item) => item.id === categoryId);
  const trpc = useTRPC();
  const router = useRouter();
  const categoryTeams = useMemo(
    () => teams.filter((team) => team.category.id === categoryId),
    [teams, categoryId],
  );
  const categoryGroups = useMemo(
    () => groups.filter((group) => group.categoryId === categoryId),
    [groups, categoryId],
  );

  const [state, setState] = useState<CategoryConfigState>(() =>
    buildInitialCategoryState(
      categoryTeams,
      categoryGroups,
      category?.meetingsPerPair ?? 1,
    ),
  );
  const [activeTeam, setActiveTeam] = useState<ConfigureTeam | null>(null);
  const [overGroupId, setOverGroupId] = useState<string | null>(null);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const generateMutation = useMutation(
    trpc.matchup.generateForCategory.mutationOptions(),
  );

  const teamCategoryById = useMemo(
    () => new Map(teams.map((team) => [team.id, team.category.id])),
    [teams],
  );
  const categoryMatchupCount = matchups.filter(
    (matchup) => teamCategoryById.get(matchup.teamA.id) === categoryId,
  ).length;
  const categoriesWithTeams = categories.filter((item) =>
    teams.some((team) => team.category.id === item.id),
  );
  const allCategoriesHaveMatchups = categoriesWithTeams.every((item) =>
    matchups.some((matchup) => teamCategoryById.get(matchup.teamA.id) === item.id),
  );

  const handleGenerate = async () => {
    const groupsPayload = Array.from({ length: state.groupCount }, (_, index) => ({
      name: GROUP_NAMES[index] ?? `Group ${index + 1}`,
      teamIds: teamsInGroup(categoryTeams, state.assignments, index).map(
        (team) => team.id,
      ),
      gamesPerTeam: state.gamesPerTeamByGroup[index] ?? 0,
    }));

    if (categoryMatchupCount > 0) {
      const confirmed = window.confirm(
        "This will replace existing matchups for this category. Other categories will not be changed.",
      );
      if (!confirmed) return;
    }

    try {
      const result = await generateMutation.mutateAsync({
        seasonId,
        categoryId,
        groups: groupsPayload,
      });
      toast.success(`Generated ${result.matchupsGenerated} matchups.`);
      const hadScheduledGames = matchups.some(
        (matchup) =>
          teamCategoryById.get(matchup.teamA.id) === categoryId && matchup.eventId,
      );
      if (hadScheduledGames) {
        toast.warning(
          "This category's scheduled games were removed. Re-run Generate Schedule if the builder already has dates.",
        );
      }
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate matchups");
    }
  };

  const handleDragStart = useCallback(
    (event: Parameters<typeof readDragStartTeam>[0]) => {
      setActiveTeam(readDragStartTeam(event));
    },
    [],
  );

  if (!category) return null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={(event) => setOverGroupId(readOverGroupId(event))}
      onDragEnd={(event) => {
        setActiveTeam(null);
        setOverGroupId(null);
        const drop = readTeamDrop(event);
        if (!drop) return;
        setState((prev) =>
          withTeamAssignment(prev, categoryTeams, drop.team.id, drop.groupIndex),
        );
      }}
    >
      {categoryTeams.length === 0 ? (
        <Card>
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
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{category.name}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </div>
                <div className="text-muted-foreground text-sm">
                  {categoryTeams.length} team{categoryTeams.length !== 1 ? "s" : ""}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Counter
                id={`groups-${category.id}`}
                name={`groups-${category.id}`}
                label="Number of Groups"
                value={state.groupCount}
                onChange={(count) =>
                  setState((prev) => withGroupCount(prev, categoryTeams, count))
                }
                min={GROUP_COUNT_MIN}
                max={GROUP_COUNT_MAX}
              />

              <div className="flex gap-3 overflow-x-auto pb-2">
                {Array.from({ length: state.groupCount }, (_, index) => (
                  <GroupDropZone
                    key={index}
                    categoryId={category.id}
                    groupIndex={index}
                    teams={teamsInGroup(categoryTeams, state.assignments, index)}
                    isOver={overGroupId === `group-${category.id}-${index}`}
                    gamesPerTeam={state.gamesPerTeamByGroup[index] ?? 0}
                    onGamesPerTeamChange={(value) =>
                      setState((prev) =>
                        withGamesPerTeam(
                          prev,
                          index,
                          value,
                          teamsInGroup(categoryTeams, prev.assignments, index).length,
                        ),
                      )
                    }
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {allCategoriesHaveMatchups && (
              <Button asChild variant="outline">
                <Link to="/seasons/$seasonId/generate" params={{ seasonId }}>
                  Continue to schedule
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            )}
            <Button
              onClick={handleGenerate}
              size="lg"
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
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
        </div>
      )}

      <DragOverlay dropAnimation={null}>
        {activeTeam ? <TeamCardOverlay team={activeTeam} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
