import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import authClient from "~/lib/auth/auth-client";
import { calculatePlayoffWinner } from "~/lib/playoffs/winner";
import { useTRPC } from "~/trpc/react";

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
  onChange: (value: string) => void;
  onBlur: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      data-playoff-score-cell="true"
      className="focus:bg-primary/10 focus:ring-primary h-8 w-full rounded-none border bg-transparent px-1 text-center tabular-nums outline-none focus:ring-1"
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ""))}
      onFocus={(event) => event.currentTarget.select()}
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
      const didSave = await onSave({ matchupId, teamId, set, points: parsed });
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
        'input[data-playoff-score-cell="true"]',
      ),
    );
    const currentIndex = editableCells.indexOf(currentInput);
    const target = editableCells[currentIndex + direction];
    target?.focus();
    target?.select();
  };

  return (
    <ScoreInput
      inputRef={inputRef}
      value={localValue}
      onChange={setLocalValue}
      onBlur={() => void commitValue()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void commitValue();
          focusRelativeCell(event.shiftKey ? -1 : 1);
        }
        if (event.key === "Tab") {
          void commitValue();
        }
      }}
    />
  );
}

export function PlayoffEventMatchupsScoreTable({ eventId }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(
    trpc.playoff.getEventMatchupsForScoring.queryOptions({ eventId }),
  );
  const { data: session } = authClient.useSession();

  const scoreQueryKey = trpc.playoff.getEventMatchupsForScoring.queryKey({ eventId });
  const { mutateAsync: saveSetScore } = useMutation(
    trpc.playoff.saveSetScore.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: scoreQueryKey });
        void queryClient.invalidateQueries({
          queryKey: trpc.playoff.getSeasonGraphs.pathKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.playoff.getScheduleBuilderState.pathKey(),
        });
      },
      onError: (error) => toast.error(error.message),
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
        await saveSetScore({ seasonId: data.event.seasonId, ...params });
        return true;
      } catch {
        return false;
      }
    },
    [data, saveSetScore],
  );

  if (!data || data.matchups.length === 0) return null;
  if (!session?.user || isLoading) return null;

  const { event, matchups } = data;
  const maxSets = Math.max(1, ...matchups.map((matchup) => matchup.bestOf));
  const setNumbers = Array.from({ length: maxSets }, (_, index) => index + 1);

  return (
    <div className="mx-auto my-8 max-w-6xl">
      <h3 className="mb-4 text-lg font-semibold">{event.name}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Matchup</TableHead>
            {setNumbers.map((setNumber) => (
              <TableHead key={setNumber} className="text-center">
                Set {setNumber}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {matchups.flatMap((matchup) => {
            const winner = calculatePlayoffWinner({
              bestOf: matchup.bestOf,
              teams: matchup.teams,
              points: matchup.points,
            });
            const setsForMatchup = setNumbers.filter((set) => set <= matchup.bestOf);

            return matchup.teams.map((slot, slotIndex) => {
              const teamId = slot.teamId;
              const isWinner = teamId === winner?.winnerTeamId;

              return (
                <TableRow
                  key={slot.id}
                  className={slotIndex === 0 ? "border-t-2" : undefined}
                >
                  <TableCell className={isWinner ? "font-semibold" : undefined}>
                    {slot.teamName ?? slot.label}
                    <span className="text-muted-foreground ml-2 text-xs">
                      {matchup.label}
                    </span>
                  </TableCell>
                  {setNumbers.map((setNumber) => {
                    if (!setsForMatchup.includes(setNumber) || !teamId) {
                      return <TableCell key={setNumber} className="bg-muted/30" />;
                    }

                    const setScore = matchup.points.find(
                      (point) => point.teamId === teamId && point.set === setNumber,
                    );
                    return (
                      <TableCell key={setNumber} className="text-center">
                        <EditableScoreCell
                          score={setScore?.points ?? null}
                          matchupId={matchup.id}
                          teamId={teamId}
                          set={setNumber}
                          onSave={handleSave}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            });
          })}
        </TableBody>
      </Table>
    </div>
  );
}
