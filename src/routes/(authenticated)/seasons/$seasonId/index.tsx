import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, CalendarDays, Settings2, Swords, Users } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export const Route = createFileRoute("/(authenticated)/seasons/$seasonId/")({
  component: SeasonOverviewPage,
  loader: async ({ params, context }) => {
    const [matchupData, teams, season] = await Promise.all([
      context.queryClient.fetchQuery(
        context.trpc.matchup.getBySeasonId.queryOptions({ seasonId: params.seasonId }),
      ),
      context.queryClient.fetchQuery(
        context.trpc.team.list.queryOptions({ seasonId: params.seasonId }),
      ),
      context.queryClient.fetchQuery(
        context.trpc.season.getById.queryOptions({ id: params.seasonId }),
      ),
    ]);

    return {
      matchupCount: matchupData.matchups.length,
      eventCount: matchupData.events.length,
      hasMatchups: matchupData.hasMatchups,
      scheduledCount: matchupData.scheduled.length,
      unscheduledCount: matchupData.unscheduled.length,
      teamCount: teams.length,
      season,
    };
  },
});

const stateColors: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  signup_open: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  signup_closed: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  active: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  completed: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

const stateLabels: Record<string, string> = {
  draft: "Draft",
  signup_open: "Sign-up Open",
  signup_closed: "Sign-up Closed",
  active: "Active",
  completed: "Completed",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SeasonOverviewPage() {
  const { seasonId } = Route.useParams();
  const {
    season,
    matchupCount,
    eventCount,
    hasMatchups,
    scheduledCount,
    unscheduledCount,
    teamCount,
  } = Route.useLoaderData();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Season header info */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">Season Overview</h2>
          <Badge
            className={stateColors[season.state] || stateColors.draft}
            variant="secondary"
          >
            {stateLabels[season.state] || season.state}
          </Badge>
        </div>
        <p className="text-muted-foreground flex items-center gap-1.5">
          <CalendarDays className="size-4" />
          {formatDate(season.startDate)} — {formatDate(season.endDate)}
        </p>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="size-4" />
              Teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{teamCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Swords className="size-4" />
              Matchups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{matchupCount}</p>
            {matchupCount > 0 && (
              <p className="text-muted-foreground mt-1 text-sm">
                {scheduledCount} scheduled, {unscheduledCount} pending
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="size-4" />
              Events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{eventCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Schedule Progress</CardDescription>
          </CardHeader>
          <CardContent>
            {matchupCount > 0 ? (
              <>
                <p className="text-3xl font-bold">
                  {Math.round((scheduledCount / matchupCount) * 100)}%
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {scheduledCount} of {matchupCount} scheduled
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No matchups yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Jump to different parts of the season management
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/seasons/$seasonId/configure" params={{ seasonId }}>
              <Settings2 className="mr-2 size-4" />
              Configure Groups
            </Link>
          </Button>

          {hasMatchups ? (
            <Button asChild>
              <Link to="/seasons/$seasonId/build" params={{ seasonId }}>
                <Calendar className="mr-2 size-4" />
                Build Schedule
              </Link>
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <Link to="/seasons/$seasonId/generate" params={{ seasonId }}>
                <Swords className="mr-2 size-4" />
                Generate Matchups
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
