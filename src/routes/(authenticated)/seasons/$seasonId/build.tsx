import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useCallback } from "react";
import { ScheduleBuilder } from "~/components/schedule-builder/schedule-builder";
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

  const { data } = useSuspenseQuery(
    trpc.matchup.getScheduleBuilderState.queryOptions({ seasonId }, { staleTime: 0 }),
  );

  const saveMutation = useMutation(trpc.matchup.saveSchedule.mutationOptions());
  const { mutateAsync: saveScheduleAsync, isPending: isSaving } = saveMutation;

  const handleSave = useCallback(
    async (snapshot: ScheduleBuilderSnapshot) => {
      await saveScheduleAsync(mapSnapshotToSaveInput(seasonId, snapshot));
    },
    [saveScheduleAsync, seasonId],
  );

  if (!data.hasMatchups) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">No matchups</h2>
          <p className="text-muted-foreground mt-2">
            Please configure teams and generate matchups first.
          </p>
          <Button asChild className="mt-4">
            <Link to="/seasons/$seasonId/configure" params={{ seasonId }}>
              Configure Groups
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const hasEvents = data.events.length > 0;

  return (
    <ScheduleBuilder
      key={`${seasonId}:${data.revision}`}
      initialState={data}
      title={
        <span className="flex flex-col items-start gap-2">
          <Link
            to="/seasons/$seasonId/generate"
            params={{ seasonId }}
            className="text-muted-foreground hover:text-foreground text-sm font-normal underline-offset-4 hover:underline"
          >
            ← Generate
          </Link>
          <span>Build Schedule</span>
        </span>
      }
      onSave={handleSave}
      isSaving={isSaving}
      toolbarActions={
        <Button asChild variant="outline" size="sm" disabled={!hasEvents}>
          <a
            href={`/api/event-pdf?seasonId=${encodeURIComponent(seasonId)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText className="mr-2 size-4" />
            Schedule PDF
          </a>
        </Button>
      }
    />
  );
}
