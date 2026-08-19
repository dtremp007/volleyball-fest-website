import { unorderedTeamPairKey } from "~/lib/schedule/matchup-pair";
import {
  clampMeetingsPerPair,
  generateRoundRobinPairs,
} from "~/lib/schedule/round-robin";

export type TeamPair = {
  teamAId: string;
  teamBId: string;
};

export function countMeetingsByPair(pairs: TeamPair[]) {
  const counts = new Map<string, number>();
  for (const pair of pairs) {
    const key = unorderedTeamPairKey(pair.teamAId, pair.teamBId);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Return the round-robin pairs still needed so each unordered pairing
 * reaches `meetingsPerPair`. Existing matchups are kept; this never
 * suggests deletions.
 */
export function missingRoundRobinPairs(
  teamIds: string[],
  existingPairs: TeamPair[],
  meetingsPerPair: number,
): TeamPair[] {
  const remaining = [...existingPairs];
  const needed: TeamPair[] = [];

  for (const pair of generateRoundRobinPairs(
    teamIds,
    clampMeetingsPerPair(meetingsPerPair),
  )) {
    const key = unorderedTeamPairKey(pair.teamAId, pair.teamBId);
    const existingIndex = remaining.findIndex(
      (existing) => unorderedTeamPairKey(existing.teamAId, existing.teamBId) === key,
    );
    if (existingIndex >= 0) {
      remaining.splice(existingIndex, 1);
      continue;
    }
    needed.push(pair);
  }

  return needed;
}
