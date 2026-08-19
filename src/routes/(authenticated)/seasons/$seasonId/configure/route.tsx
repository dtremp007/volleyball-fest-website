import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/(authenticated)/seasons/$seasonId/configure")({
  component: ConfigureLayout,
  loader: async ({ params, context }) => {
    const [categories, teams, season, groups, matchupsData] = await Promise.all([
      context.queryClient.fetchQuery(context.trpc.category.getAll.queryOptions()),
      context.queryClient.fetchQuery(
        context.trpc.team.list.queryOptions({ seasonId: params.seasonId }),
      ),
      context.queryClient.fetchQuery(
        context.trpc.season.getById.queryOptions({ id: params.seasonId }),
      ),
      context.queryClient.fetchQuery(
        context.trpc.group.listForSeason.queryOptions({ seasonId: params.seasonId }),
      ),
      context.queryClient.fetchQuery(
        context.trpc.matchup.getBySeasonId.queryOptions(
          { seasonId: params.seasonId },
          { staleTime: 0 },
        ),
      ),
    ]);

    return { categories, teams, season, groups, matchups: matchupsData.matchups };
  },
});

function ConfigureLayout() {
  const { seasonId } = Route.useParams();
  const { categories, teams, season } = Route.useLoaderData();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const categoriesWithTeams = categories.filter((category) =>
    teams.some((team) => team.category.id === category.id),
  );

  const overviewPath = `/seasons/${seasonId}/configure`;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">Configure Groups</h2>
        <p className="text-muted-foreground mt-2">
          Set groups and games per team for {season.name}, then generate matchups for each
          category.
        </p>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2 border-b pb-px">
        <Link
          to="/seasons/$seasonId/configure"
          params={{ seasonId }}
          activeOptions={{ exact: true }}
          className={cn(
            "text-muted-foreground hover:text-foreground -mb-px border-b-2 px-3 py-2 text-sm font-medium",
            pathname === overviewPath
              ? "border-primary text-foreground"
              : "border-transparent",
          )}
        >
          Overview
        </Link>
        {categoriesWithTeams.map((category) => {
          const href = `/seasons/${seasonId}/configure/${category.id}`;
          const isActive = pathname === href;
          return (
            <Link
              key={category.id}
              to="/seasons/$seasonId/configure/$categoryId"
              params={{ seasonId, categoryId: category.id }}
              className={cn(
                "text-muted-foreground hover:text-foreground -mb-px border-b-2 px-3 py-2 text-sm font-medium",
                isActive ? "border-primary text-foreground" : "border-transparent",
              )}
            >
              {category.name}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
