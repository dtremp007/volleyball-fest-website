import { clampGamesPerTeam } from "~/lib/schedule/games-per-team";

export type TeamPair = { teamAId: string; teamBId: string };

function swapPair(pair: TeamPair): TeamPair {
  return { teamAId: pair.teamBId, teamBId: pair.teamAId };
}

function unorderedPairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * 1-factorization of K_n for even n (circle method).
 * Each round is a perfect matching: every team plays exactly once.
 */
function oneFactorsEven(teamIds: string[]): TeamPair[][] {
  const n = teamIds.length;
  if (n < 2 || n % 2 !== 0) return [];

  const rotating = teamIds.slice(0, n - 1);
  const fixed = teamIds[n - 1];
  if (!fixed) return [];

  const rounds: TeamPair[][] = [];
  for (let round = 0; round < n - 1; round++) {
    const pairs: TeamPair[] = [];
    const first = rotating[0];
    if (first) {
      pairs.push({ teamAId: first, teamBId: fixed });
    }
    for (let i = 1; i < n / 2; i++) {
      const a = rotating[i];
      const b = rotating[n - 1 - i];
      if (!a || !b) continue;
      pairs.push({ teamAId: a, teamBId: b });
    }
    rounds.push(pairs);
    const last = rotating.pop();
    if (last) rotating.unshift(last);
  }
  return rounds;
}

/**
 * Circulant k-regular graph for odd n and even k.
 * Team i plays i±1 … i±(k/2) (mod n).
 */
function circulantPairs(teamIds: string[], degree: number): TeamPair[] {
  const n = teamIds.length;
  if (n < 2 || degree <= 0) return [];

  const half = degree / 2;
  const seen = new Set<string>();
  const pairs: TeamPair[] = [];

  for (let i = 0; i < n; i++) {
    for (let distance = 1; distance <= half; distance++) {
      const j = (i + distance) % n;
      const teamAId = teamIds[i];
      const teamBId = teamIds[j];
      if (!teamAId || !teamBId) continue;
      const key = unorderedPairKey(teamAId, teamBId);
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ teamAId, teamBId });
    }
  }

  return pairs;
}

function completeRoundRobinPairs(teamIds: string[]): TeamPair[] {
  if (teamIds.length % 2 === 0) {
    return oneFactorsEven(teamIds).flat();
  }
  return circulantPairs(teamIds, teamIds.length - 1);
}

function regularPartialPairs(teamIds: string[], degree: number): TeamPair[] {
  if (degree <= 0) return [];
  if (teamIds.length % 2 === 0) {
    return oneFactorsEven(teamIds).slice(0, degree).flat();
  }
  return circulantPairs(teamIds, degree);
}

function withCopySwap(pairs: TeamPair[], copyIndex: number): TeamPair[] {
  const swap = copyIndex % 2 === 1;
  return swap ? pairs.map(swapPair) : pairs;
}

/**
 * Generate a k-regular pairing: every team plays `gamesPerTeam` games.
 * Below n-1 this is a partial round-robin; above n-1 it adds rematches.
 */
export function generatePairsForGamesPerTeam(
  teamIds: string[],
  gamesPerTeam: number,
): TeamPair[] {
  const n = teamIds.length;
  if (n < 2) return [];

  const k = clampGamesPerTeam(n, gamesPerTeam);
  if (k === 0) return [];

  const completeDegree = n - 1;
  const fullCopies = Math.floor(k / completeDegree);
  const remainder = k % completeDegree;
  const complete = completeRoundRobinPairs(teamIds);
  const pairs: TeamPair[] = [];

  for (let copy = 0; copy < fullCopies; copy++) {
    pairs.push(...withCopySwap(complete, copy));
  }

  if (remainder > 0) {
    pairs.push(...withCopySwap(regularPartialPairs(teamIds, remainder), fullCopies));
  }

  return pairs;
}
