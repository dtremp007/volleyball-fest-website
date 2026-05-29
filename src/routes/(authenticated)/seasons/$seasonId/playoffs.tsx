import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Braces, GitBranch, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { useTRPC } from "~/trpc/react";

export const Route = createFileRoute("/(authenticated)/seasons/$seasonId/playoffs")({
  component: PlayoffsPage,
  loader: async ({ params, context }) => {
    const [season, categories] = await Promise.all([
      context.queryClient.fetchQuery(
        context.trpc.season.getById.queryOptions({ id: params.seasonId }),
      ),
      context.queryClient.fetchQuery(context.trpc.category.getAll.queryOptions()),
    ]);

    return { season, categories };
  },
});

const roundLabels: Record<string, string> = {
  "play-in": "Play-in",
  "quarter-final": "Quarterfinals",
  semifinal: "Semifinals",
  final: "Final",
};

const roundOrder: Record<string, number> = {
  "play-in": 0,
  "quarter-final": 1,
  semifinal: 2,
  final: 3,
};

function PlayoffsPage() {
  const { seasonId } = Route.useParams();
  const { season, categories } = Route.useLoaderData();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");

  const graphQueryOptions = trpc.playoff.getGraph.queryOptions(
    { seasonId, categoryId },
    { enabled: Boolean(categoryId), staleTime: 0 },
  );
  const graphQuery = useQuery(graphQueryOptions);

  const generateMutation = useMutation(trpc.playoff.generate.mutationOptions());
  const clearMutation = useMutation(trpc.playoff.clear.mutationOptions());

  const selectedCategory = categories.find((category) => category.id === categoryId);
  const matchups = useMemo(() => graphQuery.data?.matchups ?? [], [graphQuery.data]);
  const hasGraph = graphQuery.data?.hasGraph ?? false;
  const hasScores = graphQuery.data?.hasScores ?? false;

  const matchupsByRound = useMemo(() => {
    const groups = new Map<string, typeof matchups>();
    for (const matchup of matchups) {
      const existing = groups.get(matchup.round) ?? [];
      existing.push(matchup);
      groups.set(matchup.round, existing);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => (roundOrder[a] ?? 99) - (roundOrder[b] ?? 99))
      .map(([round, roundMatchups]) => ({
        round,
        matchups: roundMatchups.sort((a, b) => a.label.localeCompare(b.label)),
      }));
  }, [matchups]);

  const invalidateGraph = async () => {
    await queryClient.invalidateQueries({ queryKey: graphQueryOptions.queryKey });
  };

  const handleGenerate = async () => {
    if (!categoryId) return;

    try {
      const result = await generateMutation.mutateAsync({ seasonId, categoryId });
      toast.success(
        `Generated ${result.matchupsGenerated} playoff matchups for ${selectedCategory?.name ?? "category"}`,
      );
      await invalidateGraph();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate playoffs");
    }
  };

  const handleClear = async () => {
    if (!categoryId) return;

    try {
      await clearMutation.mutateAsync({ seasonId, categoryId });
      toast.success("Playoff graph cleared");
      await invalidateGraph();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear playoffs");
    }
  };

  const isMutating = generateMutation.isPending || clearMutation.isPending;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">Playoffs</h2>
          <Badge variant="secondary">{season.name}</Badge>
        </div>
        <p className="text-muted-foreground">
          Generate and inspect the stored playoff graph by category.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Generate Graph</CardTitle>
            <CardDescription>
              Uses current standings and the first supported two-group format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <NativeSelect
                id="category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                {categories.map((category) => (
                  <NativeSelectOption key={category.id} value={category.id}>
                    {category.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={!categoryId || hasGraph || isMutating}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 size-4" />
                )}
                Generate Playoffs
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={!categoryId || !hasGraph || hasScores || isMutating}
              >
                {clearMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 size-4" />
                )}
                Clear Graph
              </Button>
            </div>

            <div className="text-muted-foreground border-t pt-4 text-sm">
              {hasGraph
                ? `${matchups.length} matchups stored for ${selectedCategory?.name}.`
                : "No playoff graph has been generated for this category yet."}
              {hasScores ? " Scores exist, so regeneration is locked." : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {graphQuery.isLoading ? (
            <Card>
              <CardContent className="text-muted-foreground flex items-center gap-2 py-8">
                <Loader2 className="size-4 animate-spin" />
                Loading playoff graph...
              </CardContent>
            </Card>
          ) : matchupsByRound.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground flex items-center gap-2 py-8">
                <GitBranch className="size-4" />
                Generate a category to see its stored playoff graph.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-4">
              {matchupsByRound.map(({ round, matchups: roundMatchups }) => (
                <section key={round} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Braces className="text-muted-foreground size-4" />
                    <h3 className="font-medium">{roundLabels[round] ?? round}</h3>
                    <Badge variant="outline">{roundMatchups.length}</Badge>
                  </div>

                  {roundMatchups.map((matchup) => (
                    <Card key={matchup.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-base">{matchup.label}</CardTitle>
                          <Badge variant="secondary">Best of {matchup.bestOf}</Badge>
                        </div>
                        <CardDescription>
                          {matchup.eventName
                            ? `${matchup.eventName} · ${matchup.courtId ?? "No court"}`
                            : "Unscheduled"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {matchup.teams.map((slot) => (
                          <div
                            key={slot.id}
                            className="bg-muted/40 flex items-center justify-between gap-3 rounded-md px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {slot.teamName ?? slot.label}
                              </p>
                              {slot.teamName ? (
                                <p className="text-muted-foreground text-xs">
                                  Seed {slot.label}
                                </p>
                              ) : (
                                <p className="text-muted-foreground text-xs">
                                  Waiting on {slot.label}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline">#{slot.slotIndex + 1}</Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
