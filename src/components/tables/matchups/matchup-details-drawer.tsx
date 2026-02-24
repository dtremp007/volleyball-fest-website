import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Loader2, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import { Route } from "~/routes/(authenticated)/seasons/$seasonId";
import { useTRPC } from "~/trpc/react";

const routeApi = getRouteApi("/(authenticated)/seasons/$seasonId/");

type Props = {
  seasonId: string;
};

type EditableSetRow = {
  set: number;
  teamAScore: string;
  teamBScore: string;
};

function buildEditableSets(
  bestOf: number,
  sets: Array<{ set: number; teamAScore: number | null; teamBScore: number | null }>,
): EditableSetRow[] {
  const bySet = new Map(sets.map((setRow) => [setRow.set, setRow]));
  return Array.from({ length: bestOf }, (_, idx) => {
    const set = idx + 1;
    const existing = bySet.get(set);
    return {
      set,
      teamAScore: existing?.teamAScore?.toString() ?? "",
      teamBScore: existing?.teamBScore?.toString() ?? "",
    };
  });
}

function resizeSets(rows: EditableSetRow[], bestOf: number): EditableSetRow[] {
  const resized = Array.from({ length: bestOf }, (_, idx) => {
    const set = idx + 1;
    const existing = rows.find((row) => row.set === set);
    return (
      existing ?? {
        set,
        teamAScore: "",
        teamBScore: "",
      }
    );
  });
  return resized;
}

export function MatchupDetailsDrawer({ seasonId }: Props) {
  const { matchupId } = routeApi.useSearch();
  const navigate = Route.useNavigate();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    ...trpc.matchup.getBySeasonId.queryOptions({ seasonId }),
    enabled: !!matchupId,
  });

  const matchup = useMemo(
    () => data?.matchups.find((item) => item.id === matchupId) ?? null,
    [data?.matchups, matchupId],
  );

  const [bestOfInput, setBestOfInput] = useState("3");
  const [sets, setSets] = useState<EditableSetRow[]>(buildEditableSets(3, []));

  useEffect(() => {
    if (!matchup) return;
    const nextBestOf = Math.max(1, matchup.bestOf);
    setBestOfInput(String(nextBestOf));
    setSets(buildEditableSets(nextBestOf, matchup.sets));
  }, [matchup]);

  const scorecardMutation = useMutation(
    trpc.matchup.saveScorecard.mutationOptions({
      onSuccess: async () => {
        toast.success("Scorecard saved");
        await queryClient.invalidateQueries({
          queryKey: trpc.matchup.getBySeasonId.queryKey({ seasonId }),
        });
      },
      onError: () => {
        toast.error("Failed to save scorecard");
      },
    }),
  );

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      navigate({
        search: (prev) => ({
          ...prev,
          matchupId: undefined,
        }),
        replace: true,
        resetScroll: false,
      });
    }
  };

  const handleBestOfChange = (value: string) => {
    setBestOfInput(value);

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) return;

    setSets((prev) => resizeSets(prev, parsed));
  };

  const handleSetScoreChange = (
    setNumber: number,
    side: "teamAScore" | "teamBScore",
    value: string,
  ) => {
    setSets((prev) =>
      prev.map((row) => (row.set === setNumber ? { ...row, [side]: value } : row)),
    );
  };

  const handleSave = () => {
    if (!matchup) return;

    const bestOf = Number(bestOfInput);
    if (!Number.isInteger(bestOf) || bestOf < 1) {
      toast.error("Best-of must be a positive number");
      return;
    }

    const payloadSets: Array<{ set: number; teamAScore: number; teamBScore: number }> =
      [];

    for (const row of sets) {
      const teamAText = row.teamAScore.trim();
      const teamBText = row.teamBScore.trim();
      const hasTeamA = teamAText.length > 0;
      const hasTeamB = teamBText.length > 0;

      if (!hasTeamA && !hasTeamB) continue;

      if (!hasTeamA || !hasTeamB) {
        toast.error(`Set ${row.set} needs both team scores`);
        return;
      }

      const teamAScore = Number(teamAText);
      const teamBScore = Number(teamBText);
      const validScores =
        Number.isInteger(teamAScore) &&
        teamAScore >= 0 &&
        Number.isInteger(teamBScore) &&
        teamBScore >= 0;

      if (!validScores) {
        toast.error(`Set ${row.set} has an invalid score`);
        return;
      }

      payloadSets.push({
        set: row.set,
        teamAScore,
        teamBScore,
      });
    }

    scorecardMutation.mutate({
      seasonId,
      matchupId: matchup.id,
      bestOf,
      sets: payloadSets,
    });
  };

  return (
    <Drawer open={!!matchupId} onOpenChange={handleOpenChange} direction="right">
      <DrawerContent className="h-full overflow-hidden data-[vaul-drawer-direction=right]:sm:max-w-3xl data-[vaul-drawer-direction=right]:xl:max-w-4xl">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>
                {matchup
                  ? `${matchup.teamA.name} vs ${matchup.teamB.name}`
                  : "Matchup details"}
              </DrawerTitle>
              <DrawerDescription>
                {matchup
                  ? `Edit best-of and per-set scores (${matchup.category})`
                  : "Edit matchup scorecard"}
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
          ) : matchup ? (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-md border p-4 md:grid-cols-2">
                <div>
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">
                    Team A
                  </p>
                  <p className="font-medium">{matchup.teamA.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">
                    Team B
                  </p>
                  <p className="font-medium">{matchup.teamB.name}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="best-of-input">Best Of</Label>
                <Input
                  id="best-of-input"
                  type="number"
                  min={1}
                  step={1}
                  value={bestOfInput}
                  onChange={(e) => handleBestOfChange(e.target.value)}
                  className="max-w-40"
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Set Scores</p>
                <div className="space-y-2">
                  {sets.map((setRow) => (
                    <div
                      key={setRow.set}
                      className="grid items-end gap-3 rounded-md border p-3 md:grid-cols-[100px_1fr_1fr]"
                    >
                      <div className="text-sm font-medium">Set {setRow.set}</div>
                      <div className="space-y-1">
                        <Label htmlFor={`set-${setRow.set}-team-a`}>
                          {matchup.teamA.name}
                        </Label>
                        <Input
                          id={`set-${setRow.set}-team-a`}
                          type="number"
                          min={0}
                          step={1}
                          value={setRow.teamAScore}
                          onChange={(e) =>
                            handleSetScoreChange(setRow.set, "teamAScore", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`set-${setRow.set}-team-b`}>
                          {matchup.teamB.name}
                        </Label>
                        <Input
                          id={`set-${setRow.set}-team-b`}
                          type="number"
                          min={0}
                          step={1}
                          value={setRow.teamBScore}
                          onChange={(e) =>
                            handleSetScoreChange(setRow.set, "teamBScore", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Matchup not found</p>
          )}
        </ScrollArea>

        <DrawerFooter className="border-t">
          <Button
            onClick={handleSave}
            disabled={!matchup || scorecardMutation.isPending}
            className="w-full"
          >
            {scorecardMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Save scorecard
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function DrawerLoadingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
