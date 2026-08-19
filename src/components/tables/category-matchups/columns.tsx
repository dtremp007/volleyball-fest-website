import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { ActionsMenu } from "./actions-menu";

export type CategoryMatchupRow = {
  id: string;
  teamA: { id: string; name: string; logoUrl: string | null };
  teamB: { id: string; name: string; logoUrl: string | null };
  groupLabel: string;
  scheduledLabel: string;
  hasScores: boolean;
};

function TeamCell({ team }: { team: { name: string; logoUrl: string | null } }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-6">
        {team.logoUrl && <AvatarImage src={team.logoUrl} alt={`${team.name} logo`} />}
        <AvatarFallback className="text-[10px] font-medium">
          {team.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium">{team.name}</span>
    </div>
  );
}

export const columns: ColumnDef<CategoryMatchupRow>[] = [
  {
    header: "Team A",
    accessorKey: "teamA.name",
    meta: {
      className: "w-[200px] min-w-[180px]",
    },
    cell: ({ row }) => <TeamCell team={row.original.teamA} />,
  },
  {
    header: "Team B",
    accessorKey: "teamB.name",
    meta: {
      className: "w-[200px] min-w-[180px]",
    },
    cell: ({ row }) => <TeamCell team={row.original.teamB} />,
  },
  {
    header: "Group",
    accessorKey: "groupLabel",
    meta: {
      className: "w-[110px] min-w-[90px]",
    },
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.groupLabel}</span>
    ),
  },
  {
    header: "Scheduled",
    accessorKey: "scheduledLabel",
    meta: {
      className: "min-w-[180px]",
    },
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.scheduledLabel}</span>
    ),
  },
  {
    header: "Status",
    accessorKey: "hasScores",
    meta: {
      className: "w-[100px] min-w-[90px]",
    },
    cell: ({ row }) =>
      row.original.hasScores ? (
        <Badge
          className="bg-violet-500/15 text-violet-700 dark:text-violet-300"
          variant="secondary"
        >
          Scored
        </Badge>
      ) : (
        <Badge variant="outline">Open</Badge>
      ),
  },
  {
    id: "actions",
    header: "Actions",
    meta: {
      className: "w-[60px] text-right border-l",
    },
    cell: ({ row }) => <ActionsMenu matchup={row.original} />,
  },
];
