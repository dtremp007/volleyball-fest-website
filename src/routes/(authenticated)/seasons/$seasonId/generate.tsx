import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useTRPC } from "~/trpc/react";

export const Route = createFileRoute("/(authenticated)/seasons/$seasonId/generate")({
  component: GeneratePage,
  loader: async ({ params, context }) => {
    const [matchupsData, scheduleConfig, season] = await Promise.all([
      context.queryClient.fetchQuery(
        context.trpc.matchup.getBySeasonId.queryOptions(
          { seasonId: params.seasonId },
          { staleTime: 0 },
        ),
      ),
      context.queryClient.fetchQuery(
        context.trpc.scheduleConfig.get.queryOptions({ seasonId: params.seasonId }),
      ),
      context.queryClient.fetchQuery(
        context.trpc.season.getById.queryOptions({ id: params.seasonId }),
      ),
    ]);

    return { matchupsData, scheduleConfig, season };
  },
});

function GeneratePage() {
  const { seasonId } = Route.useParams();
  const { matchupsData, scheduleConfig, season } = Route.useLoaderData();
  const navigate = useNavigate();
  const trpc = useTRPC();

  // Get total matchups count
  const totalMatchups = matchupsData.matchups.length;

  // State for selected dates
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  // State for schedule config
  const [startTime, setStartTime] = useState(
    scheduleConfig?.defaultStartTime || "16:15",
  );
  const [gamesPerEvening, setGamesPerEvening] = useState(
    scheduleConfig?.gamesPerEvening || 7,
  );

  const generateScheduleMutation = useMutation(
    trpc.matchup.generateSchedule.mutationOptions(),
  );

  // Calculate capacity
  const selectedDatesCount = selectedDates.length;
  const courtsPerEvent = 2; // Court A and Court B
  const totalCapacity = selectedDatesCount * gamesPerEvening * courtsPerEvent;
  const estimatedSlotsNeeded = Math.ceil(totalMatchups * 1.25);
  const hasEnoughCapacity = totalCapacity >= estimatedSlotsNeeded;
  const capacityStatus = hasEnoughCapacity ? "sufficient" : "insufficient";

  const handleGenerateSchedule = async () => {
    if (selectedDates.length === 0) {
      toast.error("Please select at least one date");
      return;
    }

    try {
      // Convert dates to YYYY-MM-DD format and dedupe
      const dateStrings = [...new Set(
        selectedDates.map((date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        }),
      )];

      const result = await generateScheduleMutation.mutateAsync({
        seasonId,
        dates: dateStrings,
        defaultStartTime: startTime,
        gamesPerEvening,
      });

      if (result.unscheduledCount > 0) {
        toast.success(
          `Scheduled ${result.scheduledCount} matchups. ${result.unscheduledCount} could not be auto-scheduled and were left unscheduled.`,
        );
      } else {
        toast.success(`Schedule generated successfully! ${result.scheduledCount} matchups placed.`);
      }
      navigate({
        to: "/seasons/$seasonId/build",
        params: { seasonId },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate schedule");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">Generate Schedule</h2>
        <p className="text-muted-foreground mt-2">
          Select dates and configure schedule settings for {season.name}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Calendar and inputs */}
        <div className="space-y-6 lg:col-span-2">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Select Game Dates</CardTitle>
              <CardDescription>
                Choose the dates for game days. You can select multiple dates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="multiple"
                showOutsideDays={false}
                numberOfMonths={3}
                defaultMonth={new Date()}
                selected={selectedDates}
                onSelect={(dates) => {
                  if (dates) {
                    setSelectedDates(Array.isArray(dates) ? dates : [dates]);
                  }
                }}
                className="rounded-lg border shadow-sm"
              />
            </CardContent>
          </Card>

          {/* Schedule Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule Configuration</CardTitle>
              <CardDescription>
                Set the default start time and number of games per evening.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Default Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="games-per-evening">Games per Evening</Label>
                <Input
                  id="games-per-evening"
                  type="number"
                  min="1"
                  max="20"
                  value={gamesPerEvening}
                  onChange={(e) => setGamesPerEvening(Number(e.target.value))}
                />
                <p className="text-muted-foreground text-sm">
                  Number of time slots per court per evening
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>Schedule generation overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Matchups</span>
                <Badge variant="secondary">{totalMatchups}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Selected Dates</span>
                <Badge variant="secondary">{selectedDatesCount}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Games per Evening</span>
                <Badge variant="secondary">{gamesPerEvening}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Courts per Event</span>
                <Badge variant="secondary">{courtsPerEvent}</Badge>
              </div>

              <div className="border-t pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Total Capacity</span>
                  <Badge
                    variant={capacityStatus === "sufficient" ? "default" : "destructive"}
                  >
                    {totalCapacity} slots
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs">
                  {totalCapacity} slots available ({selectedDatesCount} dates ×{" "}
                  {gamesPerEvening} games × {courtsPerEvent} courts)
                </p>
              </div>

              {!hasEnoughCapacity && selectedDatesCount > 0 && (
                <div className="bg-destructive/10 border-destructive/20 flex items-start gap-2 rounded-md border p-3">
                  <AlertCircle className="text-destructive mt-0.5 size-4 shrink-0" />
                  <div className="text-destructive text-sm">
                    <p className="font-medium">Low Capacity Warning</p>
                    <p className="mt-1 text-xs">
                      You might need ~{estimatedSlotsNeeded} slots to schedule all {totalMatchups} matchups due to constraints. Unplaced matchups will remain in the unscheduled panel.
                    </p>
                  </div>
                </div>
              )}

              {hasEnoughCapacity && selectedDatesCount > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-green-500/20 bg-green-500/10 p-3">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-green-600" />
                  <div className="text-sm text-green-600">
                    <p className="font-medium">Ready to Generate</p>
                    <p className="mt-1 text-xs">
                      Capacity seems sufficient to schedule all {totalMatchups} matchups.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleGenerateSchedule}
                disabled={
                  selectedDatesCount === 0 ||
                  generateScheduleMutation.isPending
                }
                className="w-full"
                size="lg"
              >
                {generateScheduleMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    Generate Schedule
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
