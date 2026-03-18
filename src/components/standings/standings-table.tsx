import { Fragment } from "react";
import { Users } from "lucide-react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";
import type { StandingsSection } from "~/lib/db/queries/schedule";

type StandingsTableProps = {
    sections: StandingsSection[];
    variant: "full" | "compact";
    limit?: number;
};

export function StandingsTable({
    sections,
    variant,
    limit,
}: StandingsTableProps) {
    const colCount = variant === "full" ? 11 : 6;

    // Flatten sections for rendering, respecting the limit (applied to team rows only)
    let teamRowsRendered = 0;
    const renderSections: Array<{
        groupName: string | null;
        teams: StandingsSection["teams"];
    }> = [];

    for (const section of sections) {
        if (limit !== undefined && teamRowsRendered >= limit) break;

        const teamsToShow = limit !== undefined
            ? section.teams.slice(0, limit - teamRowsRendered)
            : section.teams;

        if (teamsToShow.length === 0) continue;

        renderSections.push({ groupName: section.groupName, teams: teamsToShow });
        teamRowsRendered += teamsToShow.length;
    }

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
                    {renderSections.map((section) => (
                        <Fragment key={section.groupName ?? "__ungrouped__"}>
                            {section.groupName !== null && (
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableCell
                                        colSpan={colCount}
                                        className="py-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase"
                                    >
                                        Grupo {section.groupName}
                                    </TableCell>
                                </TableRow>
                            )}
                            {section.teams.map((team) => (
                                <TableRow key={team.teamId}>
                                    <TableCell className="text-muted-foreground text-center font-medium">
                                        {team.rank}
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
                        </Fragment>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
