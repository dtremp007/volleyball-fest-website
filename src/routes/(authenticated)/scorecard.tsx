import {
    addDays,
    isWithinInterval,
    parseISO,
    startOfDay,
    subDays,
} from "date-fns";
import { createFileRoute } from "@tanstack/react-router";

import { EventMatchupsScoreTable } from "~/components/schedule/event-matchups-score-table";

export const Route = createFileRoute("/(authenticated)/scorecard")({
    component: ScorecardPage,
    loader: async ({ context }) => {
        const schedule = await context.queryClient.fetchQuery(
            context.trpc.matchup.getPublicSchedule.queryOptions({
                seasonId: "season-2026-spring",
                upcomingOnly: false,
            }),
        );

        const today = startOfDay(new Date());
        const range = { start: subDays(today, 2), end: addDays(today, 2) };
        const eventWithin2Days = schedule.find((e) => {
            const eventDate = startOfDay(parseISO(e.date));
            return isWithinInterval(eventDate, range);
        });

        const eventId = eventWithin2Days?.id ?? null;

        if (eventId) {
            await context.queryClient.fetchQuery(
                context.trpc.matchup.getEventMatchupsForScoring.queryOptions({
                    eventId,
                }),
            );
        }

        return { eventId };
    },
});

function ScorecardPage() {
    const { eventId } = Route.useLoaderData();

    if (!eventId) {
        return (
            <div className="container mx-auto px-4 py-8">
                <p className="text-muted-foreground">
                    No hay partidos programados para anotar en los próximos días.
                </p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <EventMatchupsScoreTable eventId={eventId} />
        </div>
    );
}
