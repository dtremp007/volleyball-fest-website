import { describe, expect, it } from "vitest";
import { buildPlayoffTemplate } from "~/lib/db/queries/playoff";
import type { TeamStanding } from "~/lib/db/queries/schedule";
import { playoffFormatEnum, type PlayoffFormat } from "~/lib/db/schema/team.schema";
import { layoutPlayoffGraph, type LayoutMatchup } from "./graph-layout";

function teams(prefix: string, count: number) {
  return Array.from(
    { length: count },
    (_, index) => ({ teamId: `${prefix}${index + 1}` }) as TeamStanding,
  );
}

function graphFor(format: PlayoffFormat, groupCount: 1 | 2): LayoutMatchup[] {
  const params = { seasonId: "s", categoryId: "c", format };
  const sections =
    groupCount === 1
      ? [{ groupName: null, teams: teams("T", 8) }]
      : [
          { groupName: "A", teams: teams("A", 8) },
          { groupName: "B", teams: teams("B", 8) },
        ];
  const template = buildPlayoffTemplate(params, sections);
  return template.matchups.map((matchup) => ({
    ...matchup,
    teams: template.teams.filter((slot) => slot.matchupId === matchup.id),
  }));
}

const cases = playoffFormatEnum.flatMap((format) =>
  ([1, 2] as const).map((groupCount) => ({ format, groupCount })),
);

describe("layoutPlayoffGraph", () => {
  it.each(cases)(
    "$format with $groupCount group(s) lays out cleanly",
    ({ format, groupCount }) => {
      const matchups = graphFor(format, groupCount);
      const { positions, columnCount } = layoutPlayoffGraph(matchups);
      const byLabel = new Map(
        matchups.map((matchup) => [matchup.label, positions.get(matchup.id)!]),
      );

      // Every card is placed.
      expect(positions.size).toBe(matchups.length);

      // No two cards in the same column overlap.
      const placed = Array.from(positions.values());
      for (const [index, a] of placed.entries()) {
        for (const b of placed.slice(index + 1)) {
          if (a.column === b.column) {
            expect(Math.abs(a.row - b.row)).toBeGreaterThanOrEqual(1);
          }
        }
      }

      // Winner edges always run exactly one column to the right.
      for (const matchup of matchups) {
        const target = positions.get(matchup.id)!;
        for (const slot of matchup.teams) {
          if (!slot.dependsOn || slot.dependencyType === "loser") continue;
          expect(target.column - positions.get(slot.dependsOn)!.column).toBe(1);
        }
      }

      // No empty columns.
      const usedColumns = new Set(placed.map((position) => position.column));
      expect(usedColumns.size).toBe(columnCount);

      // Final is in the last column, Tercer Lugar directly below it.
      const final = byLabel.get("Final")!;
      const thirdPlace = byLabel.get("Tercer Lugar")!;
      expect(final.column).toBe(columnCount - 1);
      expect(thirdPlace).toEqual({ column: final.column, row: final.row + 1 });
    },
  );

  it("puts single-group Top 6 play-ins next to the semifinals they feed", () => {
    const matchups = graphFor("top-6", 1);
    const { positions } = layoutPlayoffGraph(matchups);
    const at = (label: string) =>
      positions.get(matchups.find((matchup) => matchup.label === label)!.id)!;

    expect(at("Match 1")).toEqual({ column: 0, row: 0 });
    expect(at("Match 2")).toEqual({ column: 0, row: 1 });
    expect(at("Semifinal 1")).toEqual({ column: 1, row: 0 });
    expect(at("Semifinal 2")).toEqual({ column: 1, row: 1 });
    expect(at("Final")).toEqual({ column: 2, row: 0.5 });
  });
});
