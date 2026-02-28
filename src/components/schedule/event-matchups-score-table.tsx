import {
    useMutation,
    useQuery,
    useQueryClient,
    useSuspenseQuery,
} from "@tanstack/react-query";
import * as React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";
import { useTRPC } from "~/trpc/react";
import { toast } from "sonner";
import authClient from "~/lib/auth/auth-client";

type Props = {
    eventId: string;
};

function ScoreInput({
    value,
    onChange,
    onBlur,
    onKeyDown,
    inputRef,
}: {
    value: string;
    onChange: (v: string) => void;
    onBlur: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
}) {
    return (
        <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            data-score-cell="true"
            className="h-8 w-full border rounded-none bg-transparent px-1 text-center tabular-nums outline-none focus:bg-primary/10 focus:ring-1 focus:ring-primary"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
        />
    );
}

function EditableScoreCell({
    score,
    matchupId,
    teamId,
    set,
    onSave,
}: {
    score: number | null;
    seasonId: string;
    matchupId: string;
    teamId: string;
    set: number;
    onSave: (params: {
        matchupId: string;
        teamId: string;
        set: number;
        points: number;
    }) => Promise<boolean>;
}) {
    const initialValue = score !== null ? String(score) : "";
    const [localValue, setLocalValue] = React.useState(initialValue);
    const lastCommittedValueRef = React.useRef(initialValue);
    const prevScoreRef = React.useRef(score);
    const isCommittingRef = React.useRef(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    if (prevScoreRef.current !== score) {
        prevScoreRef.current = score;
        if (!isCommittingRef.current) {
            const externalValue = score !== null ? String(score) : "";
            lastCommittedValueRef.current = externalValue;
            setLocalValue(externalValue);
        }
    }

    const commitValue = React.useCallback(async () => {
        if (isCommittingRef.current) return false;

        const trimmedValue = localValue.trim();
        if (!trimmedValue.length) {
            setLocalValue(lastCommittedValueRef.current);
            return false;
        }

        const parsed = Number.parseInt(trimmedValue, 10);
        if (Number.isNaN(parsed) || parsed < 0) {
            setLocalValue(lastCommittedValueRef.current);
            return false;
        }

        const normalizedValue = String(parsed);
        if (normalizedValue === lastCommittedValueRef.current) {
            setLocalValue(normalizedValue);
            return false;
        }

        isCommittingRef.current = true;
        try {
            const didSave = await onSave({
                matchupId,
                teamId,
                set,
                points: parsed,
            });
            if (didSave) {
                lastCommittedValueRef.current = normalizedValue;
                setLocalValue(normalizedValue);
                return true;
            }
            setLocalValue(lastCommittedValueRef.current);
            return false;
        } finally {
            isCommittingRef.current = false;
        }
    }, [localValue, matchupId, teamId, set, onSave]);

    const focusRelativeCell = (direction: 1 | -1) => {
        const currentInput = inputRef.current;
        if (!currentInput) return;
        const editableCells = Array.from(
            document.querySelectorAll<HTMLInputElement>(
                'input[data-score-cell="true"]',
            ),
        );
        const currentIndex = editableCells.indexOf(currentInput);
        if (currentIndex < 0) return;
        const target = editableCells[currentIndex + direction];
        if (!target) return;
        target.focus();
        target.select();
    };

    return (
        <ScoreInput
            inputRef={inputRef}
            value={localValue}
            onChange={setLocalValue}
            onBlur={() => void commitValue()}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    void commitValue();
                    focusRelativeCell(e.shiftKey ? -1 : 1);
                }
                if (e.key === "Tab") {
                    void commitValue();
                }
            }}
        />
    );
}

export function EventMatchupsScoreTable({ eventId }: Props) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery(
        trpc.matchup.getEventMatchupsForScoring.queryOptions({ eventId }),
    );
    const { data: session } = authClient.useSession();

    const scoreQueryKey = trpc.matchup.getEventMatchupsForScoring.queryKey({
        eventId,
    });

    const { mutateAsync: saveSetScore } = useMutation(
        trpc.matchup.saveSetScore.mutationOptions({
            onSuccess: () => {
                void queryClient.invalidateQueries({ queryKey: scoreQueryKey });
            },
            onError: (error) => {
                toast.error(error.message);
            },
        }),
    );

    const handleSave = React.useCallback(
        async (params: {
            matchupId: string;
            teamId: string;
            set: number;
            points: number;
        }) => {
            if (!data) return false;
            try {
                await saveSetScore({
                    seasonId: data.event.seasonId,
                    ...params,
                });
                return true;
            } catch {
                return false;
            }
        },
        [data, saveSetScore],
    );

    if (!data || data.matchups.length === 0) return null;

    const { event, matchups } = data;

    if (!session?.user || isLoading) return null;

    return (
        <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold">{event.name}</h3>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Equipos</TableHead>
                        <TableHead className="text-center">Set 1</TableHead>
                        <TableHead className="text-center">Set 2</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {matchups.flatMap((matchup) => {
                        const set1 = matchup.sets.find((s) => s.set === 1);
                        const set2 = matchup.sets.find((s) => s.set === 2);
                        return (
                            <>
                                <TableRow
                                    key={`${matchup.id}-a`}
                                    className="border-t-2"
                                >
                                    <TableCell>{matchup.teamA.name}</TableCell>
                                    <TableCell className="text-center">
                                        <EditableScoreCell
                                            score={set1?.teamAScore ?? null}
                                            seasonId={event.seasonId}
                                            matchupId={matchup.id}
                                            teamId={matchup.teamA.id}
                                            set={1}
                                            onSave={handleSave}
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <EditableScoreCell
                                            score={set2?.teamAScore ?? null}
                                            seasonId={event.seasonId}
                                            matchupId={matchup.id}
                                            teamId={matchup.teamA.id}
                                            set={2}
                                            onSave={handleSave}
                                        />
                                    </TableCell>
                                </TableRow>
                                <TableRow key={`${matchup.id}-b`}>
                                    <TableCell>{matchup.teamB.name}</TableCell>
                                    <TableCell className="text-center">
                                        <EditableScoreCell
                                            score={set1?.teamBScore ?? null}
                                            seasonId={event.seasonId}
                                            matchupId={matchup.id}
                                            teamId={matchup.teamB.id}
                                            set={1}
                                            onSave={handleSave}
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <EditableScoreCell
                                            score={set2?.teamBScore ?? null}
                                            seasonId={event.seasonId}
                                            matchupId={matchup.id}
                                            teamId={matchup.teamB.id}
                                            set={2}
                                            onSave={handleSave}
                                        />
                                    </TableCell>
                                </TableRow>
                            </>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
