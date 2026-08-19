import { createFileRoute } from "@tanstack/react-router";
import { SeasonAssistantChat } from "~/components/assistant/chat";

export const Route = createFileRoute("/(authenticated)/seasons/$seasonId/chat")({
  component: SeasonAssistantPage,
  loader: async ({ params, context }) => {
    const season = await context.queryClient.ensureQueryData(
      context.trpc.season.getById.queryOptions({ id: params.seasonId }),
    );
    return {
      seasonName: season?.name ?? "this season",
    };
  },
});

function SeasonAssistantPage() {
  const { seasonId } = Route.useParams();
  const { seasonName } = Route.useLoaderData();

  return (
    <div className="container mx-auto flex h-[calc(100dvh-11rem)] max-w-4xl flex-col px-4 py-6">
      <SeasonAssistantChat seasonId={seasonId} seasonName={seasonName} />
    </div>
  );
}
