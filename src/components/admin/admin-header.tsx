import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Check, ChevronsUpDown, Plus } from "lucide-react";
import { useEffect } from "react";
import { SeasonStatusDialog } from "~/components/admin/season-status-dialog";
import { SignOutButton } from "~/components/sign-out-button";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { getSeasonSwitchTarget, LAST_SEASON_STORAGE_KEY } from "~/lib/season-navigation";
import { useTRPC } from "~/trpc/react";
import type { SeasonState } from "~/validators/season.validators";

const stateLabels: Record<string, string> = {
  draft: "Draft",
  signup_open: "Sign-up open",
  signup_closed: "Sign-up closed",
  active: "Active",
  completed: "Completed",
};

type Props = {
  user: { name?: string | null; email?: string | null };
};

export function AdminHeader({ user }: Props) {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const seasonId = "seasonId" in params ? String(params.seasonId) : undefined;
  const { pathname, search } = useRouterState({
    select: (state) => ({
      pathname: state.location.pathname,
      search: state.location.search as { categoryId?: string },
    }),
  });
  const { data: seasons = [], isLoading } = useQuery(trpc.season.getAll.queryOptions());
  const currentSeason = seasons.find((season) => season.id === seasonId);
  const openSeasons = seasons.filter((season) => season.state !== "completed");
  const completedSeasons = seasons.filter((season) => season.state === "completed");

  useEffect(() => {
    if (currentSeason) localStorage.setItem(LAST_SEASON_STORAGE_KEY, currentSeason.id);
  }, [currentSeason]);

  const switchSeason = (targetSeasonId: string) => {
    const target = seasonId
      ? getSeasonSwitchTarget(pathname, seasonId, targetSeasonId)
      : `/seasons/${targetSeasonId}`;
    const nextSearch = target.endsWith("/teams") ? { categoryId: search.categoryId } : {};
    navigate({ to: target, search: nextSearch, replace: false });
  };

  const initials = (user.name || user.email || "Admin")
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="bg-background sticky top-0 z-40 border-b">
      <div className="container mx-auto flex h-16 items-center gap-3 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src="/icon-no-bg-512.png" alt="Volleyball Fest" className="size-9" />
          <span className="hidden font-semibold tracking-tight sm:inline">
            Go to Site
          </span>
        </Link>

        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          {currentSeason?.state && (
            <SeasonStatusDialog
              seasonId={currentSeason.id}
              currentState={currentSeason.state as SeasonState}
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 max-w-full justify-between gap-3 px-3 sm:min-w-56"
                disabled={isLoading}
              >
                <span className="min-w-0 text-left">
                  <span className="block truncate font-semibold">
                    {currentSeason?.name ??
                      (isLoading ? "Loading seasons…" : "Choose a season")}
                  </span>
                  {currentSeason?.state && (
                    <span className="text-muted-foreground block text-xs sm:hidden">
                      {stateLabels[currentSeason.state]}
                    </span>
                  )}
                </span>
                <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Current and upcoming</DropdownMenuLabel>
              <DropdownMenuGroup>
                {openSeasons.map((season) => (
                  <DropdownMenuItem
                    key={season.id}
                    onSelect={() => switchSeason(season.id)}
                  >
                    <CalendarDays className="size-4" />
                    <span className="min-w-0 flex-1 truncate">{season.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {stateLabels[season.state ?? "draft"]}
                    </span>
                    {season.id === seasonId && <Check className="size-4" />}
                  </DropdownMenuItem>
                ))}
                {!openSeasons.length && (
                  <DropdownMenuItem disabled>No current seasons</DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              {completedSeasons.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Completed</DropdownMenuLabel>
                  {completedSeasons.map((season) => (
                    <DropdownMenuItem
                      key={season.id}
                      onSelect={() => switchSeason(season.id)}
                    >
                      <span className="min-w-0 flex-1 truncate">{season.name}</span>
                      {season.id === seasonId && <Check className="size-4" />}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/seasons/new">
                  <Plus className="size-4" />
                  Create season
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/seasons">
                  <CalendarDays className="size-4" />
                  Manage seasons
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Account menu" className="rounded-full">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate font-medium">
                  {user.name || "League admin"}
                </span>
                {user.email && (
                  <span className="text-muted-foreground block truncate text-xs">
                    {user.email}
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <SignOutButton
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
