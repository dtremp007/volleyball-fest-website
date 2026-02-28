import type { Row, Table } from "@tanstack/react-table";
import * as React from "react";
import type { MatchupRow, SetSubRow } from "./columns";

type Props = {
    row: Row<MatchupRow>;
    table: Table<MatchupRow>;
    teamKey: "teamA" | "teamB";
};

export function EditableScoreCell({ row, table, teamKey }: Props) {
    const original = row.original as SetSubRow;

    const score = teamKey === "teamA"
        ? original.teamAScore
        : original.teamBScore;
    const teamId = teamKey === "teamA" ? original.teamAId : original.teamBId;
    const meta = table.options.meta;
    const updateSetScore = meta?.updateSetScore;
    const inputRef = React.useRef<HTMLInputElement>(null);
    const isCommittingRef = React.useRef(false);
    const initialValue = score !== null ? String(score) : "";

    const [localValue, setLocalValue] = React.useState(initialValue);
    const lastCommittedValueRef = React.useRef(localValue);
    const prevScoreRef = React.useRef(score);

    if (prevScoreRef.current !== score) {
        prevScoreRef.current = score;
        if (!isCommittingRef.current) {
            const externalValue = score !== null ? String(score) : "";
            lastCommittedValueRef.current = externalValue;
            setLocalValue(externalValue);
        }
    }

    const commitValue = React.useCallback(async () => {
        if (!updateSetScore || isCommittingRef.current) return false;

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
            const didSave = await updateSetScore({
                matchupId: original.matchupId,
                teamId,
                set: original.set,
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
    }, [localValue, original.matchupId, original.set, teamId, updateSetScore]);

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

    if (original.rowType !== "set") return null;

    return (
        <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            data-score-cell="true"
            className="h-8 w-14 border rounded-none bg-transparent px-1 text-center tabular-nums outline-none focus:bg-primary/10 focus:ring-1 focus:ring-primary"
            value={localValue}
            onChange={(e) =>
                setLocalValue(e.target.value.replace(/[^\d]/g, ""))
            }
            onFocus={(e) => e.currentTarget.select()}
            onBlur={() => {
                void commitValue();
            }}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    void commitValue();
                    focusRelativeCell(e.shiftKey ? -1 : 1);
                    return;
                }
                if (e.key === "Tab") {
                    void commitValue();
                }
            }}
        />
    );
}
