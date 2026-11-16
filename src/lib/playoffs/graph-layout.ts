export type LayoutMatchup = {
  id: string;
  round: string;
  label: string;
  teams: Array<{
    slotIndex: number;
    dependsOn: string | null;
    dependencyType: string;
  }>;
};

export type LayoutPosition = {
  /** 0 = leftmost column; the final sits in the last column. */
  column: number;
  /** Vertical position in card-rows; may be fractional (centered between feeders). */
  row: number;
};

export type PlayoffGraphLayout = {
  positions: Map<string, LayoutPosition>;
  columnCount: number;
  /** Bottom edge of the layout in card-rows (max row + 1). */
  rowCount: number;
};

/**
 * Lays a playoff graph out as a bracket derived from its winner dependencies,
 * so it works for any format (one or two groups, byes, play-ins, round of 16)
 * without per-round coordinates:
 *
 * - Columns count back from the final: a matchup sits one column left of the
 *   matchup its winner feeds. Missing rounds leave no empty columns, and a
 *   play-in sits right next to the game it feeds.
 * - Rows walk the bracket from the final in slot order. Games nobody feeds into
 *   take the next free row; a game with feeders is centered on them, so every
 *   edge runs left-to-right without crossings.
 * - Loser-fed games (Tercer Lugar) sit in the final's column, below the bracket.
 */
export function layoutPlayoffGraph(matchups: LayoutMatchup[]): PlayoffGraphLayout {
  const byId = new Map(matchups.map((matchup) => [matchup.id, matchup]));
  const winnerFeeders = new Map<string, string[]>();
  const fedIds = new Set<string>();

  for (const matchup of matchups) {
    const feeders = [...matchup.teams]
      .sort((a, b) => a.slotIndex - b.slotIndex)
      .filter((slot) => slot.dependsOn && slot.dependencyType !== "loser")
      .map((slot) => slot.dependsOn!)
      .filter((id, index, ids) => byId.has(id) && ids.indexOf(id) === index);
    winnerFeeders.set(matchup.id, feeders);
    feeders.forEach((id) => fedIds.add(id));
  }

  const isLoserFed = (matchup: LayoutMatchup) =>
    matchup.teams.some((slot) => slot.dependsOn && slot.dependencyType === "loser") &&
    (winnerFeeders.get(matchup.id)?.length ?? 0) === 0;

  const roots = sortByBracketOrder(
    matchups.filter((matchup) => !fedIds.has(matchup.id) && !isLoserFed(matchup)),
  );
  const loserFed = sortByBracketOrder(
    matchups.filter((matchup) => !fedIds.has(matchup.id) && isLoserFed(matchup)),
  );

  // Depth = distance from the root, taking the longest path if a game feeds two.
  const depth = new Map<string, number>();
  const assignDepth = (id: string, value: number, path: Set<string>) => {
    if (path.has(id)) return; // defensive: ignore cycles
    if ((depth.get(id) ?? -1) >= value) return;
    depth.set(id, value);
    path.add(id);
    for (const feederId of winnerFeeders.get(id) ?? []) {
      assignDepth(feederId, value + 1, path);
    }
    path.delete(id);
  };
  roots.forEach((root) => assignDepth(root.id, 0, new Set()));

  const maxDepth = Math.max(0, ...depth.values());
  const rows = new Map<string, number>();
  let nextRow = 0;

  const assignRow = (id: string): number => {
    const existing = rows.get(id);
    if (existing !== undefined) return existing;
    rows.set(id, Number.NaN); // mark in progress
    const feederRows = (winnerFeeders.get(id) ?? []).map(assignRow);
    const finite = feederRows.filter((row) => Number.isFinite(row));
    const row =
      finite.length > 0
        ? finite.reduce((sum, value) => sum + value, 0) / finite.length
        : nextRow++;
    rows.set(id, row);
    return row;
  };

  const positions = new Map<string, LayoutPosition>();
  for (const root of roots) {
    assignRow(root.id);
  }
  for (const matchup of matchups) {
    const row = rows.get(matchup.id);
    if (row === undefined || !Number.isFinite(row)) continue;
    positions.set(matchup.id, {
      column: maxDepth - (depth.get(matchup.id) ?? 0),
      row,
    });
  }

  const bracketBottom = Math.max(
    0,
    ...Array.from(positions.values(), (position) => position.row + 1),
  );
  const finalPosition = roots[0] ? positions.get(roots[0].id) : undefined;
  let loserRow = finalPosition ? finalPosition.row + 1 : bracketBottom;
  for (const matchup of loserFed) {
    positions.set(matchup.id, { column: maxDepth, row: loserRow++ });
  }

  // Anything not reachable from a root (shouldn't happen) goes below the rest.
  let orphanRow = Math.max(bracketBottom, loserRow);
  for (const matchup of sortByBracketOrder(matchups)) {
    if (positions.has(matchup.id)) continue;
    positions.set(matchup.id, { column: 0, row: orphanRow++ });
  }

  return {
    positions,
    columnCount: maxDepth + 1,
    rowCount: Math.max(
      0,
      ...Array.from(positions.values(), (position) => position.row + 1),
    ),
  };
}

function sortByBracketOrder(matchups: LayoutMatchup[]) {
  return [...matchups].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true }),
  );
}
