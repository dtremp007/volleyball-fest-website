import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Route } from "~/routes/(authenticated)/teams";
import { useTRPC } from "~/trpc/react";

const routeApi = getRouteApi("/(authenticated)/teams/");

export function TeamDetailsDrawer() {
  const { teamId } = routeApi.useSearch();
  const navigate = Route.useNavigate();
  const trpc = useTRPC();

  const { data: team, isLoading } = useQuery({
    ...trpc.team.getById.queryOptions({ id: teamId! }),
    enabled: !!teamId,
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      navigate({ search: (prev) => ({ ...prev, teamId: undefined }) });
    }
  };

  const handleEditClick = () => {
    navigate({ to: "/signup-form", search: { teamId: teamId } });
  };

  return (
    <Drawer open={!!teamId} onOpenChange={handleOpenChange} direction="right">
      <DrawerContent className="h-full overflow-hidden">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isLoading ? (
                <>
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </>
              ) : team ? (
                <>
                  <Avatar className="size-10">
                    {team.logoUrl && (
                      <AvatarImage src={team.logoUrl} alt={`${team.name} logo`} />
                    )}
                    <AvatarFallback className="text-sm font-medium">
                      {team.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DrawerTitle>{team.name}</DrawerTitle>
                    <DrawerDescription>
                      <Badge variant="secondary" className="mt-1">
                        {team.category.name}
                      </Badge>
                    </DrawerDescription>
                  </div>
                </>
              ) : null}
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <ScrollArea className="h-0 flex-1 p-4">
          {isLoading ? (
            <DrawerLoadingSkeleton />
          ) : team ? (
            <div className="space-y-6">
              {/* Captain Info */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Captain
                </h3>
                <div className="space-y-1">
                  <p className="font-medium">{team.captainName}</p>
                  <a
                    href={`tel:${team.captainPhone}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {team.captainPhone}
                  </a>
                </div>
              </section>

              {/* Co-Captain Info */}
              {team.coCaptainName && (
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Co-Captain
                  </h3>
                  <div className="space-y-1">
                    <p className="font-medium">{team.coCaptainName}</p>
                    {team.coCaptainPhone && (
                      <a
                        href={`tel:${team.coCaptainPhone}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {team.coCaptainPhone}
                      </a>
                    )}
                  </div>
                </section>
              )}

              <Separator />

              {/* Players */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Players ({team.players?.length ?? 0})
                </h3>
                <div className="space-y-2">
                  {team.players?.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between rounded-lg border p-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded bg-muted text-xs font-medium">
                          {player.jerseyNumber || "-"}
                        </span>
                        <span className="font-medium">{player.name}</span>
                      </div>
                      {player.position?.name && (
                        <Badge variant="outline" className="text-xs">
                          {player.position.name}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {(!team.players || team.players.length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      No players registered
                    </p>
                  )}
                </div>
              </section>

              <Separator />

              {/* Coming From */}
              {team.comingFrom && (
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Coming From
                  </h3>
                  <p className="text-sm">{team.comingFrom}</p>
                </section>
              )}

              {/* Unavailable Dates */}
              {team.unavailableDates && (
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Unavailable Dates
                  </h3>
                  <p className="text-sm">{team.unavailableDates}</p>
                </section>
              )}

              {/* Notes */}
              {team.notes && (
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Notes
                  </h3>
                  <p className="text-sm">{team.notes}</p>
                </section>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Team not found</p>
          )}
        </ScrollArea>

        <DrawerFooter className="border-t">
          <Button onClick={handleEditClick} className="w-full">
            Edit Team
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function DrawerLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <section>
        <Skeleton className="h-4 w-16 mb-2" />
        <Skeleton className="h-5 w-32 mb-1" />
        <Skeleton className="h-4 w-28" />
      </section>

      <Separator />

      <section>
        <Skeleton className="h-4 w-20 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </section>
    </div>
  );
}
