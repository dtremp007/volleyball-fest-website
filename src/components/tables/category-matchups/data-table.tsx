import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Row,
} from "@tanstack/react-table";
import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { Route } from "~/routes/(authenticated)/seasons/$seasonId/configure/$categoryId/matchups";
import { Route as ConfigureLayoutRoute } from "~/routes/(authenticated)/seasons/$seasonId/configure/route";
import type { RouterOutputs } from "~/trpc/router";
import { columns, type CategoryMatchupRow } from "./columns";

type SeasonTeam = RouterOutputs["team"]["list"][number];
type SeasonGroup = RouterOutputs["group"]["listForSeason"][number];
type SeasonMatchup = RouterOutputs["matchup"]["getBySeasonId"]["matchups"][number];
type SeasonEvent = RouterOutputs["matchup"]["getBySeasonId"]["events"][number];

function groupLabelForTeams(
  teamAId: string,
  teamBId: string,
  teams: SeasonTeam[],
  groups: SeasonGroup[],
) {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const groupById = new Map(groups.map((group) => [group.id, group.name]));
  const teamAGroup = groupById.get(teamById.get(teamAId)?.groupId ?? "");
  const teamBGroup = groupById.get(teamById.get(teamBId)?.groupId ?? "");

  if (teamAGroup && teamBGroup && teamAGroup === teamBGroup) return teamAGroup;
  if (teamAGroup && teamBGroup) return `${teamAGroup} / ${teamBGroup}`;
  return teamAGroup ?? teamBGroup ?? "—";
}

function scheduledLabel(matchup: SeasonMatchup, events: SeasonEvent[]) {
  if (!matchup.eventId) return "Unscheduled";

  const event = events.find((item) => item.id === matchup.eventId);
  const parts: string[] = [];
  if (event?.name) parts.push(event.name);
  if (matchup.courtId) parts.push(`Court ${matchup.courtId}`);
  if (matchup.slotIndex != null) parts.push(`Slot ${matchup.slotIndex + 1}`);
  return parts.join(" · ") || "Scheduled";
}

function toTableRows(
  matchups: SeasonMatchup[],
  teams: SeasonTeam[],
  groups: SeasonGroup[],
  events: SeasonEvent[],
  categoryId: string,
): CategoryMatchupRow[] {
  const teamCategoryById = new Map(teams.map((team) => [team.id, team.category.id]));

  return matchups
    .filter((matchup) => teamCategoryById.get(matchup.teamA.id) === categoryId)
    .map((matchup) => ({
      id: matchup.id,
      teamA: {
        id: matchup.teamA.id,
        name: matchup.teamA.name,
        logoUrl: matchup.teamA.logoUrl,
      },
      teamB: {
        id: matchup.teamB.id,
        name: matchup.teamB.name,
        logoUrl: matchup.teamB.logoUrl,
      },
      groupLabel: groupLabelForTeams(matchup.teamA.id, matchup.teamB.id, teams, groups),
      scheduledLabel: scheduledLabel(matchup, events),
      hasScores: matchup.hasScores,
    }));
}

function MatchupRow({ row }: { row: Row<CategoryMatchupRow> }) {
  const navigate = Route.useNavigate();

  const handleRowClick = (cellId: string, e: React.MouseEvent) => {
    if (cellId === "actions") return;
    if (
      e.target instanceof HTMLElement &&
      (e.target.closest("a") || e.target.closest("button"))
    ) {
      return;
    }

    navigate({
      search: (prev) => ({ ...prev, matchupId: row.original.id }),
      replace: true,
      resetScroll: false,
    });
  };

  return (
    <TableRow className="group h-[57px] cursor-pointer hover:bg-[#F2F1EF] hover:dark:bg-[#0f0f0f]">
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={cn(cell.column.columnDef.meta?.className)}
          onClick={(e) => handleRowClick(cell.column.id, e)}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

export function CategoryMatchupsDataTable() {
  "use no memo";
  const { categoryId } = Route.useParams();
  const { teams, groups, matchups, events } = ConfigureLayoutRoute.useLoaderData();
  const rows = useMemo(
    () => toTableRows(matchups, teams, groups, events, categoryId),
    [matchups, teams, groups, events, categoryId],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!rows.length) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No matchups yet. Generate them from Groups, or add one here.
      </p>
    );
  }

  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {table.getHeaderGroups().map((headerGroup) =>
              headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(header.column.columnDef.meta?.className)}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              )),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <MatchupRow key={row.id} row={row} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
