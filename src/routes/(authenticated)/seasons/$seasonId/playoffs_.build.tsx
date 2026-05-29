import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarPlus, Loader2 } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { ScheduleBuilder } from "~/components/schedule-builder/schedule-builder";
import { Button } from "~/components/ui/button";
import { mapPlayoffSnapshotToSaveInput } from "~/lib/schedule/playoff-builder-state";
import { useTRPC } from "~/trpc/react";
import type { ScheduleBuilderSnapshot } from "~/validators/schedule-builder.validators";

export const Route = createFileRoute(
  "/(authenticated)/seasons/$seasonId/playoffs_/build",
)({
  component: PlayoffBuildPage,
  loader: async ({ params, context }) => {
    const { seasonId } = params;
    await context.queryClient.fetchQuery(
      context.trpc.playoff.getScheduleBuilderState.queryOptions(
        { seasonId },
        { staleTime: 0 },
      ),
    );
  },
});

function PlayoffBuildPage() {
  const { seasonId } = Route.useParams();
  const trpc = useTRPC();

  const { data, refetch, isRefetching } = useSuspenseQuery(
    trpc.playoff.getScheduleBuilderState.queryOptions({ seasonId }, { staleTime: 0 }),
  );
  const saveMutation = useMutation(trpc.playoff.saveSchedule.mutationOptions());
  const { mutateAsync: saveScheduleAsync, isPending: isSaving } = saveMutation;
  const createDatesMutation = useMutation(
    trpc.playoff.createDefaultScheduleEvents.mutationOptions(),
  );
  const { mutateAsync: createDatesAsync, isPending: isCreatingDates } =
    createDatesMutation;

  const handleSave = useCallback(
    async (snapshot: ScheduleBuilderSnapshot) => {
      await saveScheduleAsync(mapPlayoffSnapshotToSaveInput(seasonId, snapshot));
    },
    [saveScheduleAsync, seasonId],
  );

  const handleCreateDates = useCallback(async () => {
    try {
      const result = await createDatesAsync({ seasonId });
      await refetch();
      toast.success(`Created ${result.eventsCreated} playoff dates.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create playoff dates",
      );
    }
  }, [createDatesAsync, refetch, seasonId]);

  if (!data.hasMatchups) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">No playoff matchups</h2>
          <p className="text-muted-foreground mt-2">
            Generate playoff brackets before building the playoff schedule.
          </p>
        </div>
      </div>
    );
  }

  const hasPlayoffDates = data.events.length > 0;
  const isBusy = isSaving || isCreatingDates || isRefetching;

  return (
    <ScheduleBuilder
      key={`${seasonId}:playoffs:${data.revision}`}
      initialState={data}
      title="Build Playoff Schedule"
      onSave={handleSave}
      isSaving={isSaving}
      toolbarActions={
        !hasPlayoffDates ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateDates}
            disabled={isBusy}
          >
            {isCreatingDates || isRefetching ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CalendarPlus className="mr-2 size-4" />
                Create Playoff Dates
              </>
            )}
          </Button>
        ) : null
      }
    />
  );
}
