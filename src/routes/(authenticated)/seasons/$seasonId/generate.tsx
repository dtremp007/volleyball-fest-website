import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlgorithmTuningPanel } from "~/components/schedule/algorithm-tuning-panel";
import { CandidateCompare } from "~/components/schedule/candidate-compare";
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
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { formatEventDateForDisplay, getDatePart } from "~/lib/schedule/slot-times";
import { useTRPC } from "~/trpc/react";
import {
  DEFAULT_SCHEDULING_WEIGHTS,
  type SchedulingWeights,
} from "~/validators/scheduling.validators";

type CandidateEffort = "low" | "medium" | "high";

export const Route = createFileRoute("/(authenticated)/seasons/$seasonId/generate")({
  component: GeneratePage,
  loader: async ({ params, context }) => {
    const [matchupsData, scheduleConfig, season, presets, drafts, categories] =
      await Promise.all([
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
        context.queryClient.fetchQuery(
          context.trpc.scheduleConfig.listPresets.queryOptions({
            seasonId: params.seasonId,
          }),
        ),
        context.queryClient.fetchQuery(
          context.trpc.scheduleDraft.list.queryOptions({ seasonId: params.seasonId }),
        ),
        context.queryClient.fetchQuery(context.trpc.category.getAll.queryOptions()),
      ]);

    return { matchupsData, scheduleConfig, season, presets, drafts, categories };
  },
});

function toDateStrings(dates: Date[]) {
  return [
    ...new Set(
      dates.map((date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }),
    ),
  ];
}

function datesFromEvents(events: Array<{ date: string }>): Date[] {
  const seen = new Set<string>();
  const dates: Date[] = [];

  for (const event of events) {
    const datePart = getDatePart(event.date);
    if (!datePart || seen.has(datePart)) continue;
    seen.add(datePart);

    const date = formatEventDateForDisplay(event.date);
    if (Number.isNaN(date.getTime())) continue;
    dates.push(date);
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
}

function GeneratePage() {
  const { seasonId } = Route.useParams();
  const { matchupsData, scheduleConfig, season, presets } = Route.useLoaderData();
  const navigate = useNavigate();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const candidatesSectionRef = useRef<HTMLDivElement>(null);

  const { data: liveMatchups } = useQuery(
    trpc.matchup.getBySeasonId.queryOptions({ seasonId }),
  );
  const { data: drafts = [] } = useQuery(
    trpc.scheduleDraft.list.queryOptions({ seasonId }),
  );
  const { data: categories = [] } = useQuery(trpc.category.getAll.queryOptions());

  const events = useMemo(() => {
    const list = liveMatchups?.events ?? matchupsData.events;
    return [...list].sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      return byDate !== 0 ? byDate : a.name.localeCompare(b.name);
    });
  }, [liveMatchups?.events, matchupsData.events]);

  const activePreset = scheduleConfig?.activePresetId
    ? presets.find((preset) => preset.id === scheduleConfig.activePresetId)
    : undefined;

  const totalMatchups = (liveMatchups?.matchups ?? matchupsData.matchups).length;

  const [selectedDates, setSelectedDates] = useState<Date[]>(() =>
    datesFromEvents(matchupsData.events),
  );
  const [startTime, setStartTime] = useState(scheduleConfig?.defaultStartTime || "16:15");
  const [gamesPerEvening, setGamesPerEvening] = useState(
    scheduleConfig?.gamesPerEvening || 7,
  );
  const [candidateCount, setCandidateCount] = useState(3);
  const [effort, setEffort] = useState<CandidateEffort>("medium");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    activePreset?.id ?? null,
  );
  const [weights, setWeights] = useState<SchedulingWeights>(
    activePreset?.weights ?? DEFAULT_SCHEDULING_WEIGHTS,
  );

  const generateScheduleMutation = useMutation(
    trpc.matchup.generateSchedule.mutationOptions(),
  );
  const generateCandidatesMutation = useMutation(
    trpc.scheduleDraft.generateCandidates.mutationOptions(),
  );

  const selectedDatesCount = selectedDates.length;
  const courtsPerEvent = 2;
  const totalCapacity = selectedDatesCount * gamesPerEvening * courtsPerEvent;
  const hasEnoughCapacity = totalCapacity >= totalMatchups;
  const capacityStatus = hasEnoughCapacity ? "sufficient" : "insufficient";
  const isGenerating =
    generateScheduleMutation.isPending || generateCandidatesMutation.isPending;

  const schedulePayload = () => ({
    seasonId,
    dates: toDateStrings(selectedDates),
    defaultStartTime: startTime,
    gamesPerEvening,
    weights,
  });

  const handleGenerateSchedule = async () => {
    if (selectedDates.length === 0) {
      toast.error("Please select at least one date");
      return;
    }

    try {
      const result = await generateScheduleMutation.mutateAsync({
        ...schedulePayload(),
        ...(selectedPresetId ? { presetId: selectedPresetId } : {}),
      });

      if (result.unscheduledCount > 0) {
        toast.success(
          `Scheduled ${result.scheduledCount} matchups. ${result.unscheduledCount} could not be auto-scheduled and were left unscheduled.`,
        );
      } else {
        toast.success(
          `Schedule generated successfully! ${result.scheduledCount} matchups placed.`,
        );
      }
      navigate({
        to: "/seasons/$seasonId/build",
        params: { seasonId },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate schedule");
    }
  };

  const handleGenerateCandidates = async () => {
    if (selectedDates.length === 0) {
      toast.error("Please select at least one date");
      return;
    }

    const toastId = toast.loading(`Generating ${candidateCount} candidate schedules...`);

    try {
      const result = await generateCandidatesMutation.mutateAsync({
        ...schedulePayload(),
        count: candidateCount,
        effort,
        ...(selectedPresetId ? { presetIds: [selectedPresetId] } : {}),
      });

      queryClient.setQueryData(trpc.scheduleDraft.list.queryKey({ seasonId }), result);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: trpc.scheduleDraft.list.queryKey({ seasonId }),
        }),
        queryClient.invalidateQueries({
          queryKey: trpc.matchup.getBySeasonId.queryKey({ seasonId }),
        }),
      ]);

      toast.success(
        `Generated ${result.length} candidates. Lower quality score is better.`,
        { id: toastId },
      );
      candidatesSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate candidates",
        { id: toastId },
      );
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
        <div className="space-y-6 lg:col-span-2">
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
                defaultMonth={selectedDates[0] ?? new Date()}
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

          <AlgorithmTuningPanel
            seasonId={seasonId}
            weights={weights}
            selectedPresetId={selectedPresetId}
            onWeightsChange={setWeights}
            onSelectedPresetIdChange={setSelectedPresetId}
          />
        </div>

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
                      You might need {totalMatchups} slots to schedule all {totalMatchups}{" "}
                      matchups. Unplaced matchups will remain in the unscheduled panel.
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
            <CardFooter className="flex-col items-stretch gap-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="candidate-count" className="text-sm font-medium">
                  Number of candidates
                </Label>
                <Input
                  id="candidate-count"
                  type="number"
                  min={2}
                  max={5}
                  value={candidateCount}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isNaN(next)) {
                      return;
                    }
                    setCandidateCount(Math.min(5, Math.max(2, next)));
                  }}
                  className="h-8 w-16"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="solver-effort" className="text-sm font-medium">
                  Search effort
                </Label>
                <NativeSelect
                  id="solver-effort"
                  value={effort}
                  onChange={(event) => setEffort(event.target.value as CandidateEffort)}
                  className="w-28"
                >
                  <NativeSelectOption value="low">Low</NativeSelectOption>
                  <NativeSelectOption value="medium">Medium</NativeSelectOption>
                  <NativeSelectOption value="high">High</NativeSelectOption>
                </NativeSelect>
              </div>
              <Button
                onClick={handleGenerateCandidates}
                disabled={selectedDatesCount === 0 || isGenerating}
                className="w-full"
                size="lg"
              >
                {generateCandidatesMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating candidates...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generate candidates
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateSchedule}
                disabled={selectedDatesCount === 0 || isGenerating}
                className="w-full"
              >
                {generateScheduleMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Schedule"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <div ref={candidatesSectionRef}>
        <CandidateCompare
          seasonId={seasonId}
          candidates={drafts}
          events={events}
          categories={categories}
          gamesPerEvening={gamesPerEvening}
        />
      </div>
    </div>
  );
}
