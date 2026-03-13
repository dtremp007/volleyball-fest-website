import {
    addDays,
    isWithinInterval,
    parseISO,
    startOfDay,
    subDays,
} from "date-fns";
import { createFileRoute } from "@tanstack/react-router";
import z from "zod";

import { EventMatchupsScoreTable } from "~/components/schedule/event-matchups-score-table";
import { Label } from "~/components/ui/label";
import {
    NativeSelect,
    NativeSelectOption,
} from "~/components/ui/native-select";

function formatEventDate(event: { date: string }) {
    return parseISO(event.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export const Route = createFileRoute("/(authenticated)/scorecard")({
    component: ScorecardPage,
    validateSearch: z.object({
        eventId: z.string().optional(),
    }),
    loaderDeps: ({ search }) => ({ eventId: search.eventId }),
    loader: async ({ context, deps }) => {
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

        const defaultEventId = eventWithin2Days?.id ?? null;
        const selectedEventId = schedule.some((event) => event.id === deps.eventId)
            ? deps.eventId!
            : defaultEventId;

        if (selectedEventId) {
            await context.queryClient.fetchQuery(
                context.trpc.matchup.getEventMatchupsForScoring.queryOptions({
                    eventId: selectedEventId,
                }),
            );
        }

        return { defaultEventId, schedule, selectedEventId };
    },
});

function ScorecardPage() {
    const navigate = Route.useNavigate();
    const { eventId } = Route.useSearch();
    const { defaultEventId, schedule, selectedEventId } = Route.useLoaderData();

    const defaultEvent = schedule.find((scheduledEvent) => scheduledEvent.id === defaultEventId);
    const manualEventId = schedule.some((scheduledEvent) => scheduledEvent.id === eventId)
        ? eventId
        : undefined;

    if (!schedule.length) {
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
            <div className="mx-auto mb-6 max-w-xl space-y-2">
                <Label htmlFor="scorecard-event">Event</Label>
                <NativeSelect
                    id="scorecard-event"
                    value={manualEventId ?? defaultEventId ?? ""}
                    onChange={(e) => {
                        navigate({
                            search: (prev) => ({
                                ...prev,
                                eventId: e.target.value || undefined,
                            }),
                            replace: true,
                            resetScroll: false,
                        });
                    }}
                >
                    {!defaultEvent && (
                        <NativeSelectOption value="">
                            Select an event...
                        </NativeSelectOption>
                    )}
                    {schedule.map((event) => (
                        <NativeSelectOption key={event.id} value={event.id}>
                            {formatEventDate(event)}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
            </div>

            {selectedEventId
                ? <EventMatchupsScoreTable eventId={selectedEventId} />
                : (
                    <p className="text-muted-foreground mx-auto max-w-xl">
                        Selecciona un evento para comenzar a capturar resultados.
                    </p>
                )}
        </div>
    );
}
