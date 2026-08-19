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

    return {
      categories,
      teams,
      season,
      groups,
      matchups: matchupsData.matchups,
      events: matchupsData.events,
    };
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

      <div className="scrollbar-none mb-6 max-w-full overflow-x-auto">
        <nav
          className="bg-muted inline-flex h-9 items-center rounded-lg p-1"
          aria-label="Configure category"
        >
          <Link
            to="/seasons/$seasonId/configure"
            params={{ seasonId }}
            activeOptions={{ exact: true }}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              pathname === overviewPath
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Overview
          </Link>
          {categoriesWithTeams.map((category) => {
            const href = `/seasons/${seasonId}/configure/${category.id}`;
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={category.id}
                to="/seasons/$seasonId/configure/$categoryId"
                params={{ seasonId, categoryId: category.id }}
                className={cn(
                  "inline-flex shrink-0 items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {category.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}
