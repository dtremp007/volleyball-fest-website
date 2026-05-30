import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Background,
  BackgroundVariant,
  Handle,
  Position,
  ReactFlow,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
  type Viewport,
} from "@xyflow/react";
import {
  CalendarDays,
  ClipboardList,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { TeamBadge } from "~/components/schedule/team-badge";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { useGraphViewportStorage } from "~/hooks/use-graph-viewport-storage";
import { calculatePlayoffWinner } from "~/lib/playoffs/winner";
import { cn } from "~/lib/utils";
import { useTRPC } from "~/trpc/react";

export const Route = createFileRoute("/(authenticated)/seasons/$seasonId/playoffs")({
  component: PlayoffsPage,
});

const roundLabels: Record<string, string> = {
  "play-in": "Play-in",
  "quarter-final": "Quarterfinals",
  semifinal: "Semifinals",
  "third-place": "Tercer Lugar",
  final: "Final",
};

const roundOrder: Record<string, number> = {
  "play-in": 0,
  "quarter-final": 1,
  semifinal: 2,
  "third-place": 3,
  final: 4,
};

const roundX: Record<string, number> = {
  "play-in": 0,
  "quarter-final": 460,
  semifinal: 920,
  "third-place": 1050,
  final: 1520,
};

const nodeTypes = {
  matchup: MatchupNode,
  categoryLabel: CategoryLabelNode,
};

const MATCHUP_GAP_Y = 275;
const CATEGORY_HEADER_Y = 0;
const CATEGORY_BODY_Y = 150;
const CATEGORY_BODY_MIN_HEIGHT = 680;
const CATEGORY_GAP_Y = 300;

type GraphData = {
  hasGraph: boolean;
  hasScores: boolean;
  matchups: PlayoffMatchup[];
};

type SeasonGraph = {
  category: { id: string; name: string };
  graph: GraphData | undefined;
};

type PlayoffMatchup = {
  id: string;
  categoryId: string;
  categoryName: string;
  label: string;
  round: string;
  bestOf: number;
  eventName: string | null;
  courtId: string | null;
  teams: PlayoffSlot[];
  points: Array<{
    teamId: string;
    set: number;
    points: number;
  }>;
};

type PlayoffSlot = {
  id: string;
  matchupId: string;
  slotIndex: number;
  teamId: string | null;
  teamName: string | null;
  teamLogoUrl: string | null;
  label: string;
  dependsOn: string | null;
  dependencyType: string;
};

type MatchupNodeData = {
  matchup: PlayoffMatchup;
};

type CategoryLabelNodeData = {
  name: string;
  matchups: number;
  locked: boolean;
};

type PlayoffFormat = "top-4" | "top-5";

const EMPTY_SEASON_GRAPHS: SeasonGraph[] = [];

function PlayoffsPage() {
  const { seasonId } = Route.useParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [playoffFormat, setPlayoffFormat] = useState<PlayoffFormat>("top-5");
  const { initialViewport, saveViewport, hasStoredViewport } = useGraphViewportStorage(
    `playoff-graph-viewport:${seasonId}`,
  );

  const seasonGraphsQueryOptions = trpc.playoff.getSeasonGraphs.queryOptions(
    { seasonId },
    { staleTime: 0 },
  );
  const seasonGraphsQuery = useQuery(seasonGraphsQueryOptions);

  const generateMutation = useMutation(trpc.playoff.generate.mutationOptions());
  const clearMutation = useMutation(trpc.playoff.clear.mutationOptions());

  const categories = seasonGraphsQuery.data?.categories ?? [];
  const graphs = seasonGraphsQuery.data?.graphs ?? EMPTY_SEASON_GRAPHS;
  const selectedCategoryId = categoryId || categories[0]?.id || "";
  const generatedGraphs = useMemo(
    () => graphs.filter(({ graph }) => graph?.hasGraph),
    [graphs],
  );
  const selectedGraph = graphs.find(
    ({ category }) => category.id === selectedCategoryId,
  )?.graph;
  const isLoading = seasonGraphsQuery.isLoading;
  const isMutating = generateMutation.isPending || clearMutation.isPending;

  const canvasElements = useMemo(
    () => buildCanvasElements(generatedGraphs),
    [generatedGraphs],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(canvasElements.nodes);
  const edges = canvasElements.edges;

  useEffect(() => {
    // Reset local drag positions only when the server-backed graph layout changes.
    // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
    setNodes(canvasElements.nodes);
  }, [canvasElements.nodes, setNodes]);

  const invalidateGraphs = async () => {
    await queryClient.invalidateQueries({ queryKey: seasonGraphsQueryOptions.queryKey });
  };

  const handleGenerate = async () => {
    if (!selectedCategoryId) return;

    const category = categories.find((item) => item.id === selectedCategoryId);
    try {
      const result = await generateMutation.mutateAsync({
        seasonId,
        categoryId: selectedCategoryId,
        format: playoffFormat,
      });
      toast.success(
        `Generated ${result.matchupsGenerated} playoff matchups for ${category?.name ?? "category"}`,
      );
      setDialogOpen(false);
      await invalidateGraphs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate playoffs");
    }
  };

  const handleClear = async () => {
    if (!selectedCategoryId) return;

    const category = categories.find((item) => item.id === selectedCategoryId);
    try {
      await clearMutation.mutateAsync({ seasonId, categoryId: selectedCategoryId });
      toast.success(`Cleared playoff graph for ${category?.name ?? "category"}`);
      setDialogOpen(false);
      await invalidateGraphs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear playoffs");
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] min-h-155">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        fitView={!hasStoredViewport}
        fitViewOptions={{ padding: 0.24 }}
        defaultViewport={initialViewport ?? undefined}
        onMoveEnd={(_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
          saveViewport(viewport);
        }}
        minZoom={0.25}
        maxZoom={1.5}
        nodesDraggable
        nodesConnectable={false}
        edgesFocusable={false}
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />

        <div className="absolute top-4 right-20 z-10 flex items-center gap-2">
          <Button asChild type="button" variant="outline" className="shadow-sm">
            <Link
              to="/seasons/$seasonId/playoffs/build"
              params={{ seasonId }}
              search={{}}
            >
              <CalendarDays className="size-4" />
              Schedule
            </Link>
          </Button>

          <Button asChild type="button" variant="outline" className="shadow-sm">
            <Link
              to="/seasons/$seasonId/playoffs/scorecard"
              params={{ seasonId }}
              search={{}}
            >
              <ClipboardList className="size-4" />
              Scorecard
            </Link>
          </Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              size="icon-lg"
              className="absolute top-4 right-4 z-10 rounded-full shadow-lg"
              aria-label="Generate playoff graph"
            >
              <Plus className="size-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Playoff Graph</DialogTitle>
              <DialogDescription>
                Choose a category and add its playoff graph to the canvas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <NativeSelect
                value={selectedCategoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                {categories.map((category) => {
                  const graph = graphs.find(
                    (item) => item.category.id === category.id,
                  )?.graph;
                  return (
                    <NativeSelectOption key={category.id} value={category.id}>
                      {category.name}
                      {graph?.hasGraph ? " (generated)" : ""}
                      {graph?.hasScores ? " (locked)" : ""}
                    </NativeSelectOption>
                  );
                })}
              </NativeSelect>

              <NativeSelect
                value={playoffFormat}
                onChange={(event) =>
                  setPlayoffFormat(event.target.value as PlayoffFormat)
                }
              >
                <NativeSelectOption value="top-5">Top 5</NativeSelectOption>
                <NativeSelectOption value="top-4">Top 4</NativeSelectOption>
              </NativeSelect>

              <div className="text-muted-foreground rounded-md border p-3 text-sm">
                {selectedGraph?.hasGraph
                  ? `${selectedGraph.matchups.length} matchups already exist for this category.`
                  : "This category has not been generated yet."}
                {selectedGraph?.hasScores
                  ? " Scores exist, so clearing is disabled."
                  : null}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={
                  !selectedCategoryId ||
                  !selectedGraph?.hasGraph ||
                  selectedGraph.hasScores ||
                  isMutating
                }
              >
                {clearMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RotateCcw className="size-4" />
                )}
                Clear
              </Button>
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={
                  !selectedCategoryId || Boolean(selectedGraph?.hasGraph) || isMutating
                }
              >
                {generateMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-muted-foreground bg-background/90 flex items-center gap-2 rounded-md border px-4 py-3 text-sm shadow-sm backdrop-blur">
              <Loader2 className="size-4 animate-spin" />
              Loading playoff canvas...
            </div>
          </div>
        ) : null}
      </ReactFlow>
    </div>
  );
}

function buildCanvasElements(
  generatedGraphs: Array<{
    category: { id: string; name: string };
    graph: GraphData | undefined;
  }>,
) {
  const nodes: Node<MatchupNodeData | CategoryLabelNodeData>[] = [];
  const edges: Edge[] = [];
  let categoryY = 0;

  generatedGraphs.forEach(({ category, graph }) => {
    const matchups = graph?.matchups ?? [];
    const rounds = new Map<string, PlayoffMatchup[]>();
    const matchupYById = new Map<string, number>();

    for (const matchup of matchups) {
      const existing = rounds.get(matchup.round) ?? [];
      existing.push(matchup);
      rounds.set(matchup.round, existing);
    }

    const maxRoundCount = Math.max(
      1,
      ...Array.from(rounds.values()).map((roundMatchups) => roundMatchups.length),
    );
    const categoryBodyHeight = Math.max(
      CATEGORY_BODY_MIN_HEIGHT,
      maxRoundCount * MATCHUP_GAP_Y,
    );

    nodes.push({
      id: `category-${category.id}`,
      type: "categoryLabel",
      position: { x: 0, y: categoryY + CATEGORY_HEADER_Y },
      data: {
        name: category.name,
        matchups: matchups.length,
        locked: Boolean(graph?.hasScores),
      },
      draggable: false,
      selectable: false,
    });

    for (const [, roundMatchups] of Array.from(rounds.entries()).sort(
      ([a], [b]) => (roundOrder[a] ?? 99) - (roundOrder[b] ?? 99),
    )) {
      const sortedMatchups = [...roundMatchups].sort((a, b) =>
        a.label.localeCompare(b.label),
      );
      const columnHeight = sortedMatchups.length * MATCHUP_GAP_Y;
      const startY =
        categoryY +
        CATEGORY_BODY_Y +
        Math.max(0, (categoryBodyHeight - columnHeight) / 2);
      sortedMatchups.forEach((matchup, matchupIndex) => {
        const fallbackY = startY + matchupIndex * MATCHUP_GAP_Y;
        const dependencyCenteredY = getDependencyCenteredY(matchup, matchupYById);
        const y = dependencyCenteredY ?? fallbackY;

        matchupYById.set(matchup.id, y);

        nodes.push({
          id: matchup.id,
          type: "matchup",
          position: {
            x: roundX[matchup.round] ?? 0,
            y,
          },
          data: { matchup },
        });

        for (const slot of matchup.teams) {
          if (!slot.dependsOn) continue;
          const dependencyType = slot.dependencyType === "loser" ? "loser" : "winner";

          edges.push({
            id: `${slot.dependsOn}-${slot.id}`,
            source: slot.dependsOn,
            sourceHandle: dependencyType,
            target: matchup.id,
            targetHandle: slot.id,
            type: "smoothstep",
            animated: false,
            className:
              dependencyType === "loser" ? "stroke-amber-600" : "stroke-muted-foreground",
          });
        }
      });
    }

    categoryY += CATEGORY_BODY_Y + categoryBodyHeight + CATEGORY_GAP_Y;
  });

  return { nodes, edges };
}

function getDependencyCenteredY(
  matchup: PlayoffMatchup,
  matchupYById: Map<string, number>,
) {
  const dependencyYValues = [
    ...new Set(
      matchup.teams
        .map((slot) => slot.dependsOn)
        .filter((dependencyId): dependencyId is string => Boolean(dependencyId)),
    ),
  ]
    .map((dependencyId) => matchupYById.get(dependencyId))
    .filter((y): y is number => y !== undefined);

  if (dependencyYValues.length < 2) return null;

  return dependencyYValues.reduce((sum, y) => sum + y, 0) / dependencyYValues.length;
}

function MatchupNode({ data, selected }: NodeProps<Node<MatchupNodeData>>) {
  const { matchup } = data;
  const winner = calculatePlayoffWinner({
    bestOf: matchup.bestOf,
    teams: matchup.teams,
    points: matchup.points,
  });

  return (
    <div
      className={cn(
        "bg-card w-70 rounded-md border shadow-sm transition-shadow",
        selected ? "ring-ring ring-2" : "hover:shadow-md",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="fallback-target"
        className="opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="winner"
        style={{ top: "calc(50% - 10px)" }}
        className="!bg-primary !size-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="loser"
        style={{ top: "calc(50% + 10px)" }}
        className="!size-3 !bg-amber-600"
      />

      <div className="border-b px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="cursor-text truncate text-sm font-semibold">{matchup.label}</p>
            <p className="text-muted-foreground truncate text-xs">
              {roundLabels[matchup.round] ?? matchup.round}
            </p>
          </div>
          <Badge variant="secondary">Best of {matchup.bestOf}</Badge>
        </div>
      </div>

      <div className="bg-accent space-y-2 px-3 py-3">
        {matchup.teams.map((slot) => {
          const isWinner = Boolean(slot.teamId && slot.teamId === winner?.winnerTeamId);

          return (
            <div key={slot.id} className="relative">
              <Handle
                type="target"
                position={Position.Left}
                id={slot.id}
                style={{ top: 18 }}
                className="!bg-muted-foreground !size-2"
              />
              <div
                className={cn(
                  "bg-background rounded-md border-2 px-3 py-2 transition-colors",
                  isWinner ? "border-emerald-500" : null,
                )}
              >
                <TeamBadge
                  name={slot.teamName ?? slot.label}
                  logoUrl={slot.teamLogoUrl}
                  className="min-w-0"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-muted-foreground border-t px-3 py-2 text-xs">
        {matchup.eventName
          ? `${matchup.eventName} · ${matchup.courtId ? `Court ${matchup.courtId}` : "No court"}`
          : "Unscheduled"}
      </div>
    </div>
  );
}

function CategoryLabelNode({ data }: NodeProps<Node<CategoryLabelNodeData>>) {
  return (
    <div className="bg-background/95 min-w-[300px] rounded-md border px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{data.name}</h3>
        <Badge variant="outline">{data.matchups} matchups</Badge>
        {data.locked ? <Badge variant="secondary">Scores locked</Badge> : null}
      </div>
    </div>
  );
}
