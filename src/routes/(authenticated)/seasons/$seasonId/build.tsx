import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { ScheduleBuilder } from "~/components/schedule-builder/schedule-builder";
import { useScheduleStore } from "~/components/schedule-builder/store";
import { Button } from "~/components/ui/button";
import { mapSnapshotToSaveInput } from "~/lib/schedule/builder-state";
import { useTRPC } from "~/trpc/react";
import type { ScheduleBuilderSnapshot } from "~/validators/schedule-builder.validators";

export const Route = createFileRoute("/(authenticated)/seasons/$seasonId/build")({
  component: BuildPage,
  loader: async ({ params, context }) => {
    const { seasonId } = params;
    await context.queryClient.fetchQuery(
      context.trpc.matchup.getScheduleBuilderState.queryOptions(
        { seasonId },
        { staleTime: 0 },
      ),
    );
  },
});

function BuildPage() {
  const { seasonId } = Route.useParams();
  const trpc = useTRPC();

  const { data, refetch, isRefetching } = useSuspenseQuery(
    trpc.matchup.getScheduleBuilderState.queryOptions({ seasonId }, { staleTime: 0 }),
  );

  const saveMutation = useMutation(trpc.matchup.saveSchedule.mutationOptions());
  const { mutateAsync: saveScheduleAsync, isPending: isSaving } = saveMutation;
  const regenerateMutation = useMutation(
    trpc.matchup.regenerateSchedule.mutationOptions(),
  );
  const { mutateAsync: regenerateScheduleAsync, isPending: isRegeneratingMutation } =
    regenerateMutation;

  const handleSave = useCallback(
    async (snapshot: ScheduleBuilderSnapshot) => {
      await saveScheduleAsync(mapSnapshotToSaveInput(seasonId, snapshot));
    },
    [saveScheduleAsync, seasonId],
  );

  const handleRegenerate = useCallback(async () => {
    const confirmationMessage = useScheduleStore.getState().isDirty
      ? "Regenerate schedule?\n\nThis will overwrite current matchup placements. Unsaved local changes will be lost."
      : "Regenerate schedule?\n\nThis will overwrite current matchup placements for this season.";
    const confirmed = window.confirm(confirmationMessage);
    if (!confirmed) return;

    try {
      const result = await regenerateScheduleAsync({ seasonId });
      await refetch();

      if (result.unscheduledCount > 0) {
        toast.success(
          `Regenerated schedule: ${result.scheduledCount} placed, ${result.unscheduledCount} unscheduled.`,
        );
      } else {
        toast.success(`Regenerated schedule: ${result.scheduledCount} matchups placed.`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to regenerate schedule",
      );
    }
  }, [refetch, regenerateScheduleAsync, seasonId]);

  if (!data.hasMatchups) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">No matchups</h2>
          <p className="text-muted-foreground mt-2">
            Please configure teams and generate matchups first.
          </p>
        </div>
      </div>
    );
  }

  const isRegenerating = isRegeneratingMutation || isRefetching;
  const isBusy = isRegenerating || isSaving;

  return (
    <ScheduleBuilder
      key={`${seasonId}:${data.revision}`}
      initialState={data}
      title="Build Schedule"
      onSave={handleSave}
      isSaving={isSaving}
      toolbarActions={
        <>
          <Button
            asChild={data.events.length > 0}
            variant="outline"
            size="sm"
            disabled={data.events.length === 0}
          >
            {data.events.length > 0 ? (
              <a
                href={`/api/event-pdf?seasonId=${encodeURIComponent(seasonId)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="mr-2 size-4" />
                Schedule PDF
              </a>
            ) : (
              <>
                <FileText className="mr-2 size-4" />
                Schedule PDF
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isBusy}
          >
            {isRegenerating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                Regenerate
              </>
            )}
          </Button>
        </>
      }
    />
  );
}
