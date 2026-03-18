import { Users } from "lucide-react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";
import type { TeamStanding } from "~/lib/db/queries/schedule";

type StandingsTableProps = {
    standings: TeamStanding[];
    variant: "full" | "compact";
    limit?: number;
};

export function StandingsTable({
    standings,
    variant,
    limit,
}: StandingsTableProps) {
    const rows = limit !== undefined ? standings.slice(0, limit) : standings;

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10 text-center">#</TableHead>
                        <TableHead>Equipo</TableHead>
                        <TableHead className="text-center">P</TableHead>
                        <TableHead className="text-center">W</TableHead>
                        <TableHead className="text-center">L</TableHead>
                        <TableHead className="text-center">T</TableHead>
                        {variant === "full" && (
                            <>
                                <TableHead className="text-center">PCT</TableHead>
                                <TableHead className="text-center">PF</TableHead>
                                <TableHead className="text-center">PA</TableHead>
                                <TableHead className="text-center">PD</TableHead>
                                <TableHead className="text-center">PTS</TableHead>
                            </>
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((team, index) => (
                        <TableRow key={team.teamId}>
                            <TableCell className="text-muted-foreground text-center font-medium">
                                {index + 1}
                            </TableCell>
                            <TableCell className="w-1/3">
                                <div className="flex items-center gap-3">
                                    <div className="relative size-8 shrink-0 overflow-hidden rounded-full bg-linear-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20">
                                        {team.teamLogoUrl
                                            ? (
                                                <img
                                                    src={team.teamLogoUrl}
                                                    alt={team.teamName}
                                                    className="size-full object-cover"
                                                />
                                            )
                                            : (
                                                <div className="flex size-full items-center justify-center">
                                                    <Users className="size-4 text-amber-600/50" />
                                                </div>
                                            )}
                                    </div>
                                    <span className="font-medium">
                                        {team.teamName}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                {team.matchesPlayed}
                            </TableCell>
                            <TableCell className="text-center font-semibold text-green-500">
                                {team.wins}
                            </TableCell>
                            <TableCell className="text-center text-red-500">
                                {team.losses}
                            </TableCell>
                            <TableCell className="text-center">
                                {team.ties}
                            </TableCell>
                            {variant === "full" && (
                                <>
                                    <TableCell className="text-center">
                                        {team.matchesPlayed > 0
                                            ? team.pct.toFixed(3)
                                            : ".000"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {team.pointsFor}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {team.pointsAgainst}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {team.pointDifferential > 0
                                            ? `+${team.pointDifferential}`
                                            : team.pointDifferential}
                                    </TableCell>
                                    <TableCell className="text-center font-bold">
                                        {team.standingsPoints}
                                    </TableCell>
                                </>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
