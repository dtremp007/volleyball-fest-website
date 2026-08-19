import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { cn } from "~/lib/utils";

export const Route = createFileRoute(
  "/(authenticated)/seasons/$seasonId/configure/$categoryId",
)({
  component: ConfigureCategoryLayout,
  loader: async ({ params, context }) => {
    const categories = await context.queryClient.fetchQuery(
      context.trpc.category.getAll.queryOptions(),
    );
    if (!categories.some((category) => category.id === params.categoryId)) {
      throw redirect({
        to: "/seasons/$seasonId/configure",
        params: { seasonId: params.seasonId },
      });
    }
  },
});

function ConfigureCategoryLayout() {
  const { seasonId, categoryId } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const groupsPath = `/seasons/${seasonId}/configure/${categoryId}`;
  const matchupsPath = `${groupsPath}/matchups`;
  const isGroups = pathname === groupsPath;
  const isMatchups = pathname === matchupsPath || pathname.startsWith(`${matchupsPath}/`);

  return (
    <div className="space-y-6">
      <div className="scrollbar-none max-w-full overflow-x-auto">
        <nav
          className="bg-muted inline-flex h-9 items-center rounded-lg p-1"
          aria-label="Category section"
        >
          <Link
            to="/seasons/$seasonId/configure/$categoryId"
            params={{ seasonId, categoryId }}
            activeOptions={{ exact: true }}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              isGroups
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Groups
          </Link>
          <Link
            to="/seasons/$seasonId/configure/$categoryId/matchups"
            params={{ seasonId, categoryId }}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              isMatchups
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Matchups
          </Link>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
