import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import { PlayoffEventMatchupsScoreTable } from "~/components/schedule/playoff-event-matchups-score-table";
import { Label } from "~/components/ui/label";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { formatEventDateForDisplay } from "~/lib/schedule/slot-times";

function formatEventDate(event: { date: string }) {
  return formatEventDateForDisplay(event.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const Route = createFileRoute(
  "/(authenticated)/seasons/$seasonId/playoffs_/scorecard",
)({
  component: PlayoffScorecardPage,
  validateSearch: z.object({
    eventId: z.string().optional(),
  }),
  loaderDeps: ({ search }) => ({ eventId: search.eventId }),
  loader: async ({ context, deps, params }) => {
    const events = await context.queryClient.fetchQuery(
      context.trpc.playoff.getScheduleEvents.queryOptions({
        seasonId: params.seasonId,
      }),
    );

    const selectedEventId = events.some((event) => event.id === deps.eventId)
      ? deps.eventId!
      : (events[0]?.id ?? null);

    if (selectedEventId) {
      await context.queryClient.fetchQuery(
        context.trpc.playoff.getEventMatchupsForScoring.queryOptions({
          eventId: selectedEventId,
        }),
      );
    }

    return { events, selectedEventId };
  },
});

function PlayoffScorecardPage() {
  const navigate = Route.useNavigate();
  const { eventId } = Route.useSearch();
  const { events, selectedEventId } = Route.useLoaderData();
  const manualEventId = events.some((event) => event.id === eventId)
    ? eventId
    : undefined;

  if (!events.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">
          No playoff events have been scheduled yet.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto mb-6 max-w-xl space-y-2">
        <Label htmlFor="playoff-scorecard-event">Playoff event</Label>
        <NativeSelect
          id="playoff-scorecard-event"
          value={manualEventId ?? selectedEventId ?? ""}
          onChange={(event) => {
            navigate({
              search: (prev) => ({
                ...prev,
                eventId: event.target.value || undefined,
              }),
              replace: true,
              resetScroll: false,
            });
          }}
        >
          {events.map((event) => (
            <NativeSelectOption key={event.id} value={event.id}>
              {formatEventDate(event)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {selectedEventId ? (
        <PlayoffEventMatchupsScoreTable eventId={selectedEventId} />
      ) : (
        <p className="text-muted-foreground mx-auto max-w-xl">
          Select a playoff event to enter scores.
        </p>
      )}
    </div>
  );
}
