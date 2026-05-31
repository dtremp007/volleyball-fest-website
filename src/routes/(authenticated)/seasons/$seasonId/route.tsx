import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { Fragment } from "react";
import { HorizontalMenuLayout, Menu } from "~/components/horizontal-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

export const Route = createFileRoute("/(authenticated)/seasons/$seasonId")({
  component: SeasonLayout,
});

const seasonLinks = [
  { label: "Overview", to: "/seasons/$seasonId" },
  { label: "Teams", to: "/seasons/$seasonId/teams" },
  { label: "Scorecard", to: "/seasons/$seasonId/scorecard" },
  { label: "Schedule Builder", to: "/seasons/$seasonId/build" },
  { label: "Playoffs", to: "/seasons/$seasonId/playoffs" },
  {
    label: "Playoffs Scorecard",
    to: "/seasons/$seasonId/playoffs/scorecard",
  },
];

const breadcrumbSegmentLabels: Record<string, string> = {
  teams: "Teams",
  scorecard: "Scorecard",
  build: "Builder",
  playoffs: "Playoffs",
  configure: "Configure Groups",
  generate: "Generate Matchups",
};

function SeasonLayout() {
  const { seasonId } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const seasonBasePath = `/seasons/${seasonId}`;
  const breadcrumbSegments = pathname
    .replace(seasonBasePath, "")
    .split("/")
    .filter(Boolean);
  const isOverview = breadcrumbSegments.length === 0;
  const breadcrumbs = breadcrumbSegments.map((segment, index) => {
    const href = `${seasonBasePath}/${breadcrumbSegments.slice(0, index + 1).join("/")}`;

    return {
      href,
      label: breadcrumbSegmentLabels[segment] ?? segment,
    };
  });

  return (
    <>
      <div className="border-border bg-background sticky -top-6 z-10 border-b">
        <div className="container mx-auto w-full px-4 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                {isOverview ? (
                  <BreadcrumbPage>
                    <Home size={16} />
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to="/seasons/$seasonId" params={{ seasonId }}>
                      <Home size={16} />
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isOverview && (
                <Fragment>
                  {breadcrumbs.map((breadcrumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;

                    return (
                      <Fragment key={breadcrumb.href}>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          {isLast ? (
                            <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild>
                              <Link to={breadcrumb.href}>{breadcrumb.label}</Link>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </Fragment>
                    );
                  })}
                </Fragment>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <HorizontalMenuLayout>
          <Menu
            links={seasonLinks.map((link) => ({
              ...link,
              params: { seasonId },
            }))}
          />
        </HorizontalMenuLayout>
      </div>
      <Outlet />
    </>
  );
}
