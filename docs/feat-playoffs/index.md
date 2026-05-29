# Playoffs

## Some info

- I forked the main db (volleyball-fest.db), we are using playoffs.db for this branch.

## Branch goal

Build the first playoff workflow separately from the regular-season workflow so we can experiment without forcing the current `matchup` model to change too early.

The first milestone is an admin page under `/seasons/$seasonId/...` where we can generate and inspect playoff graphs. The graph should be a direct representation of what is stored in the database: matchups, matchup teams, scores/points, and dependency edges between matchups.

Once that works, we can decide which ideas should be folded back into the regular-season tables.

## First milestone

Create enough backend and UI structure to:

1. Pick a season/category or league grouping.
2. Generate playoff matchups from standings/seeds.
3. Store the generated graph in separate playoff tables.
4. Render the stored graph back on an admin page without relying on hardcoded bracket UI.
5. Keep dependency information explicit so score updates can later advance winners into waiting matchups.

This first page does not need to solve scheduling, PDFs, public display, or score entry yet. It should prove that the database shape can describe the playoff bracket correctly.

## Working schema

Keep playoff work separated from the regular-season implementation for now:

- `src/lib/db/schema/playoff.schema.ts`
- `src/lib/db/queries/playoff.ts`
- `src/trpc/router/playoff.trpc.ts`
- `src/routes/(authenticated)/seasons/$seasonId/playoffs.tsx`

Generation is per category. We do not need a separate playoff tournament/bracket parent table yet; `seasonId + categoryId` is enough to identify a category's playoff graph.

### `playoff_schedule_event`

Same setup as the current `schedule_event` table in `src/lib/db/schema/schedule.schema.ts`, but dedicated to playoff scheduling for now.

Fields:

- `id`
- `name`
- `startTime` - same current meaning/format as regular schedule events
- `seasonId`

There is no `categoryId` on the event. A playoff night can contain matchups from several categories.

### `playoff_matchup`

Represents one node in the playoff graph.

Fields:

- `id`
- `seasonId`
- `categoryId`
- `label` - examples: `M1`, `QF 1`, `SF 2`, `Final`
- `round` - examples: "play-in", "quarter-final", "semifinal", "final"
- `bestOf`
- `eventId` - nullable; references `playoff_schedule_event.id`
- `courtId` - nullable; same idea as regular-season matchup placement
- `duration` - same default as regular-season matchup unless playoffs need a different one

These scheduling fields intentionally mirror the current regular-season `matchup` table in `src/lib/db/schema/schedule.schema.ts`. The difference is that playoff matchup teams are stored through `playoff_matchup_team`, not as `teamAId` / `teamBId` columns on the matchup itself.

### `playoff_matchup_team`

Represents one slot in a matchup.

Fields:

- `id`
- `matchupId`
- `slotIndex` - nullable; same idea as regular-season matchup placement
- `teamId` - nullable when the slot is waiting on a previous matchup
- `label` - examples: `A1`, `B5`, `Winner M1`
- `dependsOn` - nullable; points to the matchup that will fill this slot

Dependencies belong to the matchup-team row because each participant slot can have a different source. For example, one semifinal can wait on the winner of QF 1 in one row and the winner of QF 2 in another row.

We do not need a separate enum/string slot field like `A` or `B`. `slotIndex` gives us ordering inside the matchup.

### `playoff_point`

Same setup as the current `points` table in `src/lib/db/schema/team.schema.ts`: one row per team per set, with a composite primary key across matchup, team, and set.

Fields:

- `teamId`
- `seasonId`
- `matchupId`
- `set`
- `points`

Likely primary key:

- `matchupId + teamId + set`

The main difference from regular-season points is only the matchup reference. Regular-season `points.matchupId` references `matchup.id`; playoff points should reference `playoff_matchup.id`.

## Generator functions

Use pure generator functions that return database-ready rows before anything is inserted.

Inputs:

- season id
- category id
- current standings/seeds, loaded automatically
- format key, inferred from advancing team counts

Outputs:

- playoff matchups
- matchup team slots
- dependency edges through `playoff_matchup_team.dependsOn`

Known formats from the diagrams:

- Top 5 from each of 2 groups advance: play-in round, quarterfinals, semifinals, final.
- Top 4 from each of 2 groups advance: quarterfinals, semifinals, final.

For now, playoff generation assumes two groups in a category.

The important design constraint is that the graph generation should not be "image-shaped"; the rendered UI should follow the stored graph.

## Regeneration rule

Generated playoff graphs are immutable once scores exist.

Before scores exist, admins can clear/regenerate the graph for a category. After any `playoff_point` rows exist for that season/category graph, regeneration should be blocked unless we later add an explicit destructive admin flow.

## Settled decisions

- Generate playoffs per category.
- Identify a playoff graph by `seasonId + categoryId`; no parent bracket table for now.
- Assume two groups per category for the first implementation.
- Use standings automatically as the source of seeds.
- Store dependencies on `playoff_matchup_team.dependsOn`.
- Use `bestOf` per matchup.
- Allow one playoff schedule event to contain matchups from several categories.

## Near-term implementation steps

1. Add the separate Drizzle schema and export it from the schema index.
2. Add a pure generator for the first known two-group formats.
3. Add protected tRPC procedures to preview, generate, fetch, and clear playoff graphs.
4. Add the admin route under `$seasonId` that can generate and render the stored graph.
5. Block regeneration once scores exist.
6. Only after the graph round-trip works, decide how score updates should advance winners into dependent slots.
