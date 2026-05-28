import { createFileRoute } from "@tanstack/react-router";
import { ScheduleBuilderPage } from "~/components/schedule-builder/schedule-builder-page";

export const Route = createFileRoute("/(authenticated)/seasons/$seasonId/build")({
  component: BuildPage,
  loader: async ({ params, context }) => {
    const { seasonId } = params;
    const data = await context.queryClient.fetchQuery(
      context.trpc.matchup.getBySeasonId.queryOptions({ seasonId }, { staleTime: 0 }),
    );
    return { data };
  },
});

function BuildPage() {
  const { seasonId } = Route.useParams();

  return (
    <ScheduleBuilderPage
      seasonId={seasonId}
      title="Build Schedule"
      emptyMessage="Please configure teams and generate matchups first."
      showRegenerate
    />
  );
}
