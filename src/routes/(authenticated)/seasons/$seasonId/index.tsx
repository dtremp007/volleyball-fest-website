import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { Suspense } from "react";
import z from "zod";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { EventsDataTable, EventsSkeleton } from "../../../../components/tables/events";
import { EventDetailsDrawer } from "../../../../components/tables/events/event-details-drawer";
import {
  PlayoffEventDetailsDrawer,
  PlayoffEventsDataTable,
  PlayoffEventsSkeleton,
} from "../../../../components/tables/playoff-events";

export const Route = createFileRoute("/(authenticated)/seasons/$seasonId/")({
  component: SeasonOverviewPage,
  validateSearch: z.object({
    view: z.enum(["events", "playoffs"]).optional(),
    eventId: z.string().optional(),
    playoffEventId: z.string().optional(),
    /** @deprecated Matchups tab removed; kept for URL compatibility */
    matchupId: z.string().optional(),
  }),
  loader: async ({ params, context }) => {
    const season = await context.queryClient.fetchQuery(
      context.trpc.season.getById.queryOptions({ id: params.seasonId }),
    );

    return { season };
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
  const navigate = Route.useNavigate();
  const { view = "events" } = Route.useSearch();
  const { season } = Route.useLoaderData();

  const handleViewChange = (nextView: string) => {
    if (nextView !== "events" && nextView !== "playoffs") return;
    navigate({
      search: (prev) => ({
        ...prev,
        view: nextView,
        eventId: nextView === "events" ? prev.eventId : undefined,
        playoffEventId: nextView === "playoffs" ? prev.playoffEventId : undefined,
      }),
    });
  };

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

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>Browse regular-season and playoff events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={view} onValueChange={handleViewChange}>
            <TabsList>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="playoffs">Playoffs</TabsTrigger>
            </TabsList>
          </Tabs>

          {view === "events" ? (
            <Suspense fallback={<EventsSkeleton />}>
              <EventsDataTable seasonId={seasonId} />
            </Suspense>
          ) : (
            <Suspense fallback={<PlayoffEventsSkeleton />}>
              <PlayoffEventsDataTable seasonId={seasonId} />
            </Suspense>
          )}
        </CardContent>
      </Card>

      <EventDetailsDrawer seasonId={seasonId} />
      <PlayoffEventDetailsDrawer />
    </div>
  );
}
