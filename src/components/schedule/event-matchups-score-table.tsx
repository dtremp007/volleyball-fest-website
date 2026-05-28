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
      className="focus:bg-primary/10 focus:ring-primary h-8 w-full rounded-none border bg-transparent px-1 text-center tabular-nums outline-none focus:ring-1"
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
      document.querySelectorAll<HTMLInputElement>('input[data-score-cell="true"]'),
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
        void queryClient.invalidateQueries({
          queryKey: trpc.matchup.getPublicSchedule.pathKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.matchup.getBySeasonId.pathKey(),
        });
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

  const maxSets = Math.max(2, ...matchups.map((m) => m.bestOf));
  const setNumbers = Array.from({ length: maxSets }, (_, i) => i + 1);

  return (
    <div className="mx-auto my-8 max-w-6xl">
      <h3 className="mb-4 text-lg font-semibold">{event.name}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Equipos</TableHead>
            {setNumbers.map((setNum) => (
              <TableHead key={setNum} className="text-center">
                Set {setNum}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {matchups.flatMap((matchup) => {
            const setsForMatchup = setNumbers.filter((n) => n <= matchup.bestOf);

            return (
              <React.Fragment key={matchup.id}>
                <TableRow className="border-t-2">
                  <TableCell>{matchup.teamA.name}</TableCell>
                  {setNumbers.map((setNum) => {
                    if (!setsForMatchup.includes(setNum)) {
                      return <TableCell key={setNum} className="bg-muted/30" />;
                    }
                    const setScore = matchup.sets.find((s) => s.set === setNum);
                    return (
                      <TableCell key={setNum} className="text-center">
                        <EditableScoreCell
                          score={setScore?.teamAScore ?? null}
                          seasonId={event.seasonId}
                          matchupId={matchup.id}
                          teamId={matchup.teamA.id}
                          set={setNum}
                          onSave={handleSave}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell>{matchup.teamB.name}</TableCell>
                  {setNumbers.map((setNum) => {
                    if (!setsForMatchup.includes(setNum)) {
                      return <TableCell key={setNum} className="bg-muted/30" />;
                    }
                    const setScore = matchup.sets.find((s) => s.set === setNum);
                    return (
                      <TableCell key={setNum} className="text-center">
                        <EditableScoreCell
                          score={setScore?.teamBScore ?? null}
                          seasonId={event.seasonId}
                          matchupId={matchup.id}
                          teamId={matchup.teamB.id}
                          set={setNum}
                          onSave={handleSave}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
