import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CandidateMiniGrid } from "~/components/schedule/candidate-mini-grid";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { useTRPC } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/router";

export type ScheduleDraftCandidate = RouterOutputs["scheduleDraft"]["list"][number];

type CategoryOption = {
  id: string;
  name: string;
  color: string;
};

type EventOption = {
  id: string;
  name: string;
};

type CandidateCompareProps = {
  seasonId: string;
  candidates: ScheduleDraftCandidate[];
  events: EventOption[];
  categories: CategoryOption[];
  gamesPerEvening: number;
};

function formatScore(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function CandidateCompare({
  seasonId,
  candidates,
  events,
  categories,
  gamesPerEvening,
}: CandidateCompareProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const applyMutation = useMutation(trpc.scheduleDraft.apply.mutationOptions());
  const clearMutation = useMutation(trpc.scheduleDraft.clear.mutationOptions());

  const handleClear = async () => {
    try {
      await clearMutation.mutateAsync({ seasonId });
      await queryClient.invalidateQueries({
        queryKey: trpc.scheduleDraft.list.queryKey({ seasonId }),
      });
      toast.success("Candidates cleared");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear candidates");
    }
  };

  const handleApply = async (id: string) => {
    try {
      const result = await applyMutation.mutateAsync({ id });
      if (result.unscheduledCount > 0) {
        toast.success(
          `Applied ${result.scheduledCount} placements. ${result.unscheduledCount} left unscheduled.`,
        );
      } else {
        toast.success(`Applied ${result.scheduledCount} placements.`);
      }
      await queryClient.invalidateQueries({
        queryKey: trpc.matchup.getScheduleBuilderState.queryKey({ seasonId }),
      });
      navigate({
        to: "/seasons/$seasonId/build",
        params: { seasonId },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply candidate");
    }
  };

  if (candidates.length === 0) {
    return null;
  }

  const bestQuality = Math.min(
    ...candidates.map((candidate) => candidate.metrics.qualityScore),
  );

  return (
    <section className="mt-8 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Candidates</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Compare generated schedules. Lower quality score is better.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={clearMutation.isPending || applyMutation.isPending}
        >
          {clearMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Clearing...
            </>
          ) : (
            "Clear candidates"
          )}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {candidates.map((candidate) => {
          const isBest =
            candidates.length > 1 && candidate.metrics.qualityScore === bestQuality;
          const isApplying =
            applyMutation.isPending && applyMutation.variables?.id === candidate.id;

          return (
            <Card
              key={candidate.id}
              className={cn("gap-4 py-4", isBest && "ring-primary/40 ring-2")}
            >
              <CardHeader className="px-4">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{candidate.name}</CardTitle>
                  {isBest ? <Badge>Best score</Badge> : null}
                </div>
                <CardDescription>
                  {candidate.presetName ?? "Defaults"} · seed {candidate.seed}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 px-4">
                <div className="space-y-1.5">
                  <MetricRow
                    label="Quality score"
                    value={formatScore(candidate.metrics.qualityScore)}
                  />
                  <MetricRow
                    label="Unscheduled"
                    value={String(candidate.metrics.unscheduledCount)}
                  />
                  <MetricRow
                    label="Category deviation"
                    value={formatScore(candidate.metrics.totalCategoryDeviation)}
                  />
                  <MetricRow
                    label="Femenil net switches"
                    value={formatScore(candidate.metrics.estimatedFemenilNetSwitches)}
                  />
                  <MetricRow
                    label="Games-per-event spread"
                    value={formatScore(candidate.metrics.gamesPerEventSpread)}
                  />
                  <MetricRow
                    label="Far-away 2-games hit rate"
                    value={formatPercent(candidate.metrics.farAwayTwoGamesHitRate)}
                  />
                </div>

                <Accordion type="single" collapsible>
                  <AccordionItem value="mini-schedule" className="border-b-0">
                    <AccordionTrigger className="py-2 text-sm">
                      Mini schedule
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      <CandidateMiniGrid
                        events={events}
                        placements={candidate.placements}
                        categories={categories}
                        gamesPerEvening={gamesPerEvening}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
              <CardFooter className="px-4">
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => handleApply(candidate.id)}
                  disabled={applyMutation.isPending || clearMutation.isPending}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    "Apply"
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
