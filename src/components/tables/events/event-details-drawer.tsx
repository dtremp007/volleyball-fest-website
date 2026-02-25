import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { ImageIcon, Loader2, X } from "lucide-react";
import { useState } from "react";
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
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  downloadScheduleImage,
  generateEventScheduleImage,
} from "~/lib/canvas/event-schedule-image";
import { Route } from "~/routes/(authenticated)/seasons/$seasonId";
import { useTRPC } from "~/trpc/react";

const TIME_SLOTS = [
  "4:15 PM",
  "5:00 PM",
  "5:45 PM",
  "6:30 PM",
  "7:15 PM",
  "8:00 PM",
  "8:45 PM",
  "9:30 PM",
];

const routeApi = getRouteApi("/(authenticated)/seasons/$seasonId/");

type Props = {
  seasonId: string;
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatSlot(slotIndex: number | null) {
  if (slotIndex === null) return "Unscheduled";
  return TIME_SLOTS[slotIndex] ?? `Slot ${slotIndex + 1}`;
}

function formatMatchup(matchup: {
  teamA: { name: string };
  teamB: { name: string };
  category: string;
}) {
  return `${matchup.teamA.name} vs ${matchup.teamB.name}`;
}

export function EventDetailsDrawer({ seasonId }: Props) {
  const { eventId } = routeApi.useSearch();
  const navigate = Route.useNavigate();
  const trpc = useTRPC();

  const { data, isLoading } = useQuery({
    ...trpc.matchup.getBySeasonId.queryOptions({ seasonId }),
    enabled: !!eventId,
  });

  const event = data?.events.find((item) => item.id === eventId);
  const matchups =
    data?.matchups
      .filter((item) => item.eventId === eventId)
      .sort((a, b) => {
        const slotCompare = (a.slotIndex ?? 999) - (b.slotIndex ?? 999);
        if (slotCompare !== 0) return slotCompare;
        return (a.courtId ?? "Z").localeCompare(b.courtId ?? "Z");
      }) ?? [];

  const scheduledMatchups = matchups.filter((matchup) => matchup.slotIndex !== null);
  const unscheduledCount = matchups.length - scheduledMatchups.length;

  const slotRows = new Map<
    number,
    {
      courtA?: (typeof scheduledMatchups)[number];
      courtB?: (typeof scheduledMatchups)[number];
    }
  >();

  for (const matchup of scheduledMatchups) {
    const slotIndex = matchup.slotIndex!;
    const slot = slotRows.get(slotIndex) ?? {};
    if (matchup.courtId === "A") slot.courtA = matchup;
    if (matchup.courtId === "B") slot.courtB = matchup;
    slotRows.set(slotIndex, slot);
  }

  const sortedSlotIndices = Array.from(slotRows.keys()).sort((a, b) => a - b);

  const [imageLoading, setImageLoading] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      navigate({
        search: (prev) => ({
          ...prev,
          eventId: undefined,
        }),
        replace: true,
        resetScroll: false,
      });
    }
  };

  const handleDownloadImage = async () => {
    if (!event) return;
    setImageLoading(true);
    try {
      const eventForImage = {
        id: event.id,
        name: event.name,
        date: event.date,
        matchups,
      };
      const blob = await generateEventScheduleImage(
        eventForImage,
        window.location.origin,
      );
      downloadScheduleImage(blob, event.name);
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <Drawer open={!!eventId} onOpenChange={handleOpenChange} direction="right">
      <DrawerContent className="h-full overflow-hidden data-[vaul-drawer-direction=right]:sm:max-w-3xl data-[vaul-drawer-direction=right]:xl:max-w-5xl">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>{event ? event.name : "Event details"}</DrawerTitle>
              <DrawerDescription>
                {event ? formatDate(event.date) : "View scheduled games for this event"}
              </DrawerDescription>
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
          ) : event ? (
            <div className="space-y-4">
              <div className="text-muted-foreground text-sm">
                {matchups.length} game{matchups.length === 1 ? "" : "s"} in this event
              </div>
              {sortedSlotIndices.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No games have been scheduled yet.
                </p>
              ) : (
                <div className="border-border overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[95px]">Time</TableHead>
                        <TableHead>Court A</TableHead>
                        <TableHead>Court B</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedSlotIndices.map((slotIndex) => {
                        const slot = slotRows.get(slotIndex)!;
                        return (
                          <TableRow key={slotIndex}>
                            <TableCell className="text-muted-foreground text-xs">
                              {formatSlot(slotIndex)}
                            </TableCell>
                            <TableCell className="whitespace-normal">
                              {slot.courtA ? (
                                <div>
                                  <div className="text-sm font-medium">
                                    {formatMatchup(slot.courtA)}
                                  </div>
                                  <div className="text-muted-foreground text-xs">
                                    {slot.courtA.category}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-normal">
                              {slot.courtB ? (
                                <div>
                                  <div className="text-sm font-medium">
                                    {formatMatchup(slot.courtB)}
                                  </div>
                                  <div className="text-muted-foreground text-xs">
                                    {slot.courtB.category}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              {unscheduledCount > 0 && (
                <p className="text-muted-foreground text-xs">
                  {unscheduledCount} game{unscheduledCount === 1 ? "" : "s"} without a
                  time slot are not shown in this table.
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Event not found</p>
          )}
        </ScrollArea>

        <DrawerFooter className="border-t">
          {event && (
            <Button
              className="w-full"
              variant="outline"
              onClick={handleDownloadImage}
              disabled={imageLoading}
            >
              {imageLoading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ImageIcon className="mr-2 size-4" />
              )}
              Download image
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function DrawerLoadingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
