/**
 * 2-set league standings: first two sets only, W/L/T from set wins, PRD tiebreak order.
 */

export type StandingsSetRow = {
  set: number;
  teamAScore: number | null;
  teamBScore: number | null;
};

/** League points and rally totals from sets 1–2 only; null if match must not count. */
export function contributionFromFirstTwoSets(
  sets: ReadonlyArray<StandingsSetRow>,
): null | { pfA: number; pfB: number; ptsA: 0 | 1 | 2; ptsB: 0 | 1 | 2 } {
  const bySet = new Map(sets.map((s) => [s.set, s]));
  const s1 = bySet.get(1);
  const s2 = bySet.get(2);
  if (!s1 || !s2) return null;
  if (
    s1.teamAScore === null ||
    s1.teamBScore === null ||
    s2.teamAScore === null ||
    s2.teamBScore === null
  ) {
    return null;
  }
  if (s1.teamAScore === s1.teamBScore || s2.teamAScore === s2.teamBScore) {
    return null;
  }

  let aWins = 0;
  let bWins = 0;
  if (s1.teamAScore > s1.teamBScore) aWins++;
  else bWins++;
  if (s2.teamAScore > s2.teamBScore) aWins++;
  else bWins++;

  const pfA = s1.teamAScore + s2.teamAScore;
  const pfB = s1.teamBScore + s2.teamBScore;

  if (aWins === 2) return { pfA, pfB, ptsA: 2, ptsB: 0 };
  if (bWins === 2) return { pfA, pfB, ptsA: 0, ptsB: 2 };
  return { pfA, pfB, ptsA: 1, ptsB: 1 };
}

export type ProcessedStandingsMatch = {
  teamAId: string;
  teamBId: string;
  ptsA: 0 | 1 | 2;
  ptsB: 0 | 1 | 2;
  pfA: number;
  pfB: number;
};

export type StandingsSortRow = {
  teamId: string;
  standingsPoints: number;
  pointDifferential: number;
  pointsFor: number;
};

function primaryCompare(a: StandingsSortRow, b: StandingsSortRow): number {
  return (
    b.standingsPoints - a.standingsPoints ||
    b.pointDifferential - a.pointDifferential ||
    b.pointsFor - a.pointsFor
  );
}

function tieBucketKey(t: StandingsSortRow): string {
  return `${t.standingsPoints}\0${t.pointDifferential}\0${t.pointsFor}`;
}

/**
 * Head-to-head among tied teams: mini-league PTS, then PD, then PF from games
 * between those teams only. Final tie: teamId order (stable stand-in for PRD coin flip).
 */
export function sortByHeadToHeadMiniLeague<T extends StandingsSortRow>(
  teams: T[],
  matches: ReadonlyArray<ProcessedStandingsMatch>,
): T[] {
  if (teams.length <= 1) return [...teams];

  const ids = new Set(teams.map((t) => t.teamId));
  const mini = new Map<string, { pts: number; pf: number; pa: number }>();
  for (const t of teams) {
    mini.set(t.teamId, { pts: 0, pf: 0, pa: 0 });
  }

  for (const m of matches) {
    if (!ids.has(m.teamAId) || !ids.has(m.teamBId)) continue;
    const sa = mini.get(m.teamAId)!;
    const sb = mini.get(m.teamBId)!;
    sa.pts += m.ptsA;
    sb.pts += m.ptsB;
    sa.pf += m.pfA;
    sa.pa += m.pfB;
    sb.pf += m.pfB;
    sb.pa += m.pfA;
  }

  return [...teams].sort((a, b) => {
    const ma = mini.get(a.teamId)!;
    const mb = mini.get(b.teamId)!;
    const pdA = ma.pf - ma.pa;
    const pdB = mb.pf - mb.pa;
    return (
      mb.pts - ma.pts ||
      pdB - pdA ||
      mb.pf - ma.pf ||
      a.teamId.localeCompare(b.teamId)
    );
  });
}

/** PTS → PD → PF → head-to-head → stable teamId. */
export function sortStandingsTeams<T extends StandingsSortRow>(
  teams: T[],
  matches: ReadonlyArray<ProcessedStandingsMatch>,
): T[] {
  if (teams.length === 0) return [];

  const sorted = [...teams].sort(primaryCompare);
  const out: T[] = [];
  let i = 0;
  while (i < sorted.length) {
    const t0 = sorted[i]!;
    const key = tieBucketKey(t0);
    let j = i + 1;
    while (j < sorted.length && tieBucketKey(sorted[j]!) === key) {
      j++;
    }
    const bucket = sorted.slice(i, j);
    if (bucket.length === 1) {
      out.push(bucket[0]!);
    } else {
      out.push(...sortByHeadToHeadMiniLeague(bucket, matches));
    }
    i = j;
  }
  return out;
}

export function standingPct(matchesPlayed: number, standingsPoints: number): number {
  if (matchesPlayed <= 0) return 0;
  return standingsPoints / (matchesPlayed * 2);
}
