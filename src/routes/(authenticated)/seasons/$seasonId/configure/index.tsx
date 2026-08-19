import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  matchupCountForGamesPerTeam,
  resolveStoredGamesPerTeam,
} from "~/lib/schedule/games-per-team";
import { Route as ConfigureLayoutRoute } from "./route";

export const Route = createFileRoute("/(authenticated)/seasons/$seasonId/configure/")({
  component: ConfigureOverviewPage,
});

type CategoryStatus = "no-teams" | "not-generated" | "generated" | "out-of-date";

function statusLabel(status: CategoryStatus) {
  switch (status) {
    case "no-teams":
      return "No teams";
    case "not-generated":
      return "Not generated";
    case "generated":
      return "Generated";
    case "out-of-date":
      return "Out of date";
  }
}

function statusVariant(status: CategoryStatus): "secondary" | "outline" | "default" {
  if (status === "generated") return "default";
  if (status === "out-of-date") return "outline";
  return "secondary";
}

function ConfigureOverviewPage() {
  const { seasonId } = Route.useParams();
  const { categories, teams, groups, matchups } = ConfigureLayoutRoute.useLoaderData();

  const matchupsByCategoryId = new Map<string, number>();
  const teamCategoryById = new Map(teams.map((team) => [team.id, team.category.id]));
  for (const matchup of matchups) {
    const categoryId = teamCategoryById.get(matchup.teamA.id);
    if (!categoryId) continue;
    matchupsByCategoryId.set(categoryId, (matchupsByCategoryId.get(categoryId) ?? 0) + 1);
  }

  const categoriesWithTeams = categories.filter((category) =>
    teams.some((team) => team.category.id === category.id),
  );
  const allGenerated =
    categoriesWithTeams.length > 0 &&
    categoriesWithTeams.every(
      (category) => (matchupsByCategoryId.get(category.id) ?? 0) > 0,
    );

  return (
    <div className="space-y-6">
      {allGenerated && (
        <div className="flex justify-end">
          <Button asChild>
            <Link to="/seasons/$seasonId/generate" params={{ seasonId }}>
              Continue to schedule
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((category) => {
          const categoryTeams = teams.filter((team) => team.category.id === category.id);
          const categoryGroups = groups.filter(
            (group) => group.categoryId === category.id,
          );
          const matchupCount = matchupsByCategoryId.get(category.id) ?? 0;

          let expectedMatchups = 0;
          if (categoryGroups.length > 0) {
            for (const group of categoryGroups) {
              const teamCount = categoryTeams.filter(
                (team) => team.groupId === group.id,
              ).length;
              const gamesPerTeam = resolveStoredGamesPerTeam(
                teamCount,
                group.gamesPerTeam,
                category.meetingsPerPair,
              );
              expectedMatchups += matchupCountForGamesPerTeam(teamCount, gamesPerTeam);
            }
          }

          let status: CategoryStatus = "not-generated";
          if (categoryTeams.length === 0) status = "no-teams";
          else if (matchupCount === 0) status = "not-generated";
          else if (categoryGroups.length > 0 && matchupCount === expectedMatchups) {
            status = "generated";
          } else {
            status = "out-of-date";
          }

          return (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{category.name}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                  <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="text-muted-foreground grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt>Teams</dt>
                    <dd className="text-foreground font-medium">
                      {categoryTeams.length}
                    </dd>
                  </div>
                  <div>
                    <dt>Groups</dt>
                    <dd className="text-foreground font-medium">
                      {categoryGroups.length || "—"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt>Games per team</dt>
                    <dd className="text-foreground font-medium">
                      {categoryGroups.length === 0
                        ? "—"
                        : categoryGroups
                            .map((group) => {
                              const teamCount = categoryTeams.filter(
                                (team) => team.groupId === group.id,
                              ).length;
                              return `Group ${group.name}: ${resolveStoredGamesPerTeam(
                                teamCount,
                                group.gamesPerTeam,
                                category.meetingsPerPair,
                              )}`;
                            })
                            .join(" · ")}
                    </dd>
                  </div>
                  <div>
                    <dt>Matchups</dt>
                    <dd className="text-foreground font-medium">{matchupCount}</dd>
                  </div>
                </dl>
                {categoryTeams.length > 0 && (
                  <Button asChild variant="outline" className="w-full">
                    <Link
                      to="/seasons/$seasonId/configure/$categoryId"
                      params={{ seasonId, categoryId: category.id }}
                    >
                      Configure {category.name}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
