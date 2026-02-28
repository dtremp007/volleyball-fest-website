import {
    useMutation,
    useQueryClient,
    useSuspenseQuery,
} from "@tanstack/react-query";
import {
    flexRender,
    getCoreRowModel,
    getExpandedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import * as React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";
import type { RouterOutputs } from "~/trpc/router";
import { useTRPC } from "~/trpc/react";
import type { MatchupTableRow, SetSubRow } from "./columns";
import { columns } from "./columns";
import { EmptyMatchupsState } from "./empty-state";
import { MatchupRowItem } from "./row";
import { toast } from "sonner";

const TIME_SLOTS = [
    "4:15 PM",
    "5:00 PM",
    "5:45 PM",
    "6:30 PM",
    "7:15 PM",
    "8:00 PM",
    "8:45 PM",
    "9:30 PM",
];

type Props = {
    seasonId: string;
};

type MatchupSeasonData = RouterOutputs["matchup"]["getBySeasonId"];
type MatchupInSeasonData = MatchupSeasonData["matchups"][number];

function getSetWins(sets: MatchupInSeasonData["sets"]) {
    const teamASetsWon = sets.reduce((acc, setScore) => {
        if (setScore.teamAScore === null || setScore.teamBScore === null) return acc;
        return setScore.teamAScore > setScore.teamBScore ? acc + 1 : acc;
    }, 0);
    const teamBSetsWon = sets.reduce((acc, setScore) => {
        if (setScore.teamAScore === null || setScore.teamBScore === null) return acc;
        return setScore.teamBScore > setScore.teamAScore ? acc + 1 : acc;
    }, 0);

    return { teamASetsWon, teamBSetsWon };
}

function patchMatchupSetScore(
    matchup: MatchupInSeasonData,
    params: { teamId: string; set: number; points: number },
): MatchupInSeasonData {
    const existingSet = matchup.sets.find((setScore) => setScore.set === params.set);
    const isTeamA = params.teamId === matchup.teamA.id;
    const isTeamB = params.teamId === matchup.teamB.id;
    if (!isTeamA && !isTeamB) return matchup;

    const nextSet = {
        set: params.set,
        teamAScore: isTeamA ? params.points : existingSet?.teamAScore ?? null,
        teamBScore: isTeamB ? params.points : existingSet?.teamBScore ?? null,
    };
    const sets = existingSet
        ? matchup.sets.map((setScore) =>
            setScore.set === params.set ? nextSet : setScore
        )
        : [...matchup.sets, nextSet].sort((a, b) => a.set - b.set);
    const { teamASetsWon, teamBSetsWon } = getSetWins(sets);

    return {
        ...matchup,
        sets,
        teamASetsWon,
        teamBSetsWon,
        hasScores: sets.some(
            (setScore) =>
                setScore.teamAScore !== null && setScore.teamBScore !== null,
        ),
    };
}

function updateMatchupInList(
    matchups: MatchupInSeasonData[],
    params: { matchupId: string; teamId: string; set: number; points: number },
) {
    return matchups.map((matchup) =>
        matchup.id === params.matchupId
            ? patchMatchupSetScore(matchup, params)
            : matchup
    );
}

export function MatchupsDataTable({ seasonId }: Props) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const { data } = useSuspenseQuery(
        trpc.matchup.getBySeasonId.queryOptions({ seasonId }),
    );
    const seasonQueryKey = trpc.matchup.getBySeasonId.queryKey({ seasonId });

    const { mutateAsync: saveSetScore } = useMutation(
        trpc.matchup.saveSetScore.mutationOptions({
            onSuccess: (_result, variables) => {
                const patchParams = {
                    matchupId: variables.matchupId,
                    teamId: variables.teamId,
                    set: variables.set,
                    points: variables.points,
                };

                queryClient.setQueryData<MatchupSeasonData>(
                    seasonQueryKey,
                    (currentData) => {
                        if (!currentData) return currentData;

                        return {
                            ...currentData,
                            matchups: updateMatchupInList(
                                currentData.matchups,
                                patchParams,
                            ),
                            scheduled: updateMatchupInList(
                                currentData.scheduled,
                                patchParams,
                            ),
                            unscheduled: updateMatchupInList(
                                currentData.unscheduled,
                                patchParams,
                            ),
                        };
                    },
                );
            },
            onError: (error) => {
                toast.error(error.message);
            },
        }),
    );

    const handleUpdateSetScore = React.useCallback(
        async ({
            matchupId,
            teamId,
            set,
            points,
        }: {
            matchupId: string;
            teamId: string;
            set: number;
            points: number;
        }) => {
            try {
                await saveSetScore({
                    seasonId,
                    matchupId,
                    teamId,
                    set,
                    points,
                });
                return true;
            } catch {
                return false;
            }
        },
        [saveSetScore, seasonId],
    );

    const matchupRowsWithSubRows = React.useMemo(() => {
        const eventsById = new Map(data.events.map((event) => [event.id, event]));
        return data.matchups
        .map((matchup) => {
            const event = matchup.eventId
                ? eventsById.get(matchup.eventId)
                : null;
            const slotLabel = matchup.slotIndex !== null
                ? (TIME_SLOTS[matchup.slotIndex] ??
                    `Slot ${matchup.slotIndex + 1}`)
                : null;

            const setsByNum = new Map(
                matchup.sets.map((s) => [
                    s.set,
                    { teamAScore: s.teamAScore, teamBScore: s.teamBScore },
                ]),
            );

            const subRows: SetSubRow[] = Array.from(
                { length: matchup.bestOf },
                (_, idx) => {
                    const set = idx + 1;
                    const scores = setsByNum.get(set) ?? {
                        teamAScore: null,
                        teamBScore: null,
                    };
                    return {
                        id: `${matchup.id}-set-${set}`,
                        depth: 1 as const,
                        rowType: "set" as const,
                        matchupId: matchup.id,
                        teamAId: matchup.teamA.id,
                        teamBId: matchup.teamB.id,
                        set,
                        teamAScore: scores.teamAScore,
                        teamBScore: scores.teamBScore,
                        teamAName: matchup.teamA.name,
                        teamBName: matchup.teamB.name,
                        bestOf: matchup.bestOf,
                        category: matchup.category,
                        courtId: matchup.courtId,
                        slotLabel,
                        isScheduled: matchup.eventId !== null,
                    };
                },
            );

            return {
                id: matchup.id,
                depth: 0 as const,
                rowType: "matchup" as const,
                teamAName: matchup.teamA.name,
                teamBName: matchup.teamB.name,
                teamAId: matchup.teamA.id,
                teamBId: matchup.teamB.id,
                category: matchup.category,
                eventName: event?.name ?? null,
                eventDate: event?.date ?? null,
                courtId: matchup.courtId,
                slotLabel,
                slotIndex: matchup.slotIndex,
                isScheduled: matchup.eventId !== null,
                bestOf: matchup.bestOf,
                teamASetsWon: matchup.teamASetsWon,
                teamBSetsWon: matchup.teamBSetsWon,
                subRows,
            };
        })
        .sort((a, b) => {
            if (a.isScheduled !== b.isScheduled) return a.isScheduled ? -1 : 1;
            if (a.eventDate && b.eventDate && a.eventDate !== b.eventDate) {
                return a.eventDate.localeCompare(b.eventDate);
            }
            const slotA = a.slotIndex ?? 999;
            const slotB = b.slotIndex ?? 999;
            if (slotA !== slotB) return slotA - slotB;
            const courtA = a.courtId ?? "Z";
            const courtB = b.courtId ?? "Z";
            if (courtA !== courtB) return courtA.localeCompare(courtB);
            return a.teamAName.localeCompare(b.teamAName);
        });
    }, [data]);

    const table = useReactTable({
        data: matchupRowsWithSubRows,
        columns,
        getRowId: (row) => row.id,
        getSubRows: (row) =>
            "subRows" in row ? (row as MatchupTableRow).subRows : undefined,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        state: { expanded: true },
        meta: {
            seasonId,
            updateSetScore: handleUpdateSetScore,
        },
    });
    const leafColumnCount = table.getAllLeafColumns().length;

    if (!matchupRowsWithSubRows.length) {
        return <EmptyMatchupsState />;
    }

    return (
        <div className="w-full">
            <div className="border-border overflow-x-auto rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {table.getHeaderGroups().map((headerGroup) =>
                                headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className={header.column.columnDef.meta
                                            ?.className}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext(),
                                            )}
                                    </TableHead>
                                ))
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.map((row) => (
                            <MatchupRowItem key={row.id} row={row} />
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell
                                colSpan={Math.max(leafColumnCount - 1, 1)}
                            >
                                Total matchups
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                                {matchupRowsWithSubRows.length}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}
