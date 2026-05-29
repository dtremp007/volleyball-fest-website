# Playoffs

## Current branch context

- We forked the main db (`volleyball-fest.db`) and are using `playoffs.db` for this branch.
- Playoff work is intentionally separated from the regular-season implementation for now.
- The regular season `matchup` table still has `teamAId` / `teamBId`.
- The playoff experiment uses matchup participant rows so a matchup can exist before both teams are known.

## What has been built

The first playoff backend and admin graph slice exists:

- `src/lib/db/schema/playoff.schema.ts`
- `src/lib/db/queries/playoff.ts`
- `src/trpc/router/playoff.trpc.ts`
- `src/routes/(authenticated)/seasons/$seasonId/playoffs.tsx`

The season overview links to the playoff route.

The current page can:

1. Fetch all category graphs for a season with one tRPC call: `playoff.getSeasonGraphs`.
2. Show all generated category graphs together on one React Flow canvas.
3. Open a plus-button dialog to generate a category graph.
4. Let the admin choose `Top 5` or `Top 4` before generation.
5. Clear a category graph while it has no scores.
6. Block clearing/regeneration once playoff scores exist.
7. Store the user's canvas viewport in `localStorage` so refreshes preserve pan/zoom.
8. Link to a dedicated playoff schedule route at `/seasons/$seasonId/playoffs/build`.

The first playoff scheduling slice is now underway before score entry and bracket
progression. The route reuses the regular-season `ScheduleBuilder` through a
playoff adapter and can create the three default playoff dates when none exist:
the Saturday after the last regular-season event, the next Saturday, and the
immediate Sunday after that second Saturday.

The current graph is admin-only. It is a visualization/editor surface, not yet a public playoff page.

## Current schema shape

### `playoff_schedule_event`

Dedicated playoff event table, similar to regular-season `schedule_event`.

Fields:

- `id`
- `name`
- `startTime`
- `seasonId`

There is no `categoryId` on the event. One playoff night can contain matchups from several categories.

### `playoff_matchup`

Represents one node/card in the playoff graph.

Fields:

- `id`
- `seasonId`
- `categoryId`
- `label` - examples: `M1`, `QF 1`, `SF 2`, `Final`
- `round` - examples: `play-in`, `quarter-final`, `semifinal`, `final`
- `bestOf`
- `eventId` - nullable; references `playoff_schedule_event.id`
- `courtId` - nullable
- `duration`

Open likely addition:

- `x` / `y` or equivalent persisted layout fields, if we want admin-edited node positions to survive reloads across browsers/devices.

### `playoff_matchup_team`

Represents one participant slot inside a matchup.

Fields:

- `id`
- `matchupId`
- `slotIndex` - participant order inside the matchup
- `teamId` - nullable when waiting on another matchup
- `label` - examples: `A1`, `B5`, `Winner M1`
- `dependsOn` - nullable; points to the matchup that will fill this slot

Dependencies belong to the matchup-team row because each participant slot can have a different source. For example, one semifinal can wait on the winner of QF 1 in one row and the winner of QF 2 in another row.

The dependency model is ready. Automatic winner advancement is not done yet.

### `playoff_point`

Same setup as the current `points` table in `src/lib/db/schema/team.schema.ts`: one row per team per set.

Fields:

- `teamId`
- `seasonId`
- `matchupId`
- `set`
- `points`

Primary key:

- `matchupId + teamId + set`

## Generator state

Generation is per category.

Inputs:

- season id
- category id
- playoff format: `top-4` or `top-5`
- current standings/seeds, loaded automatically

Outputs:

- playoff matchups
- matchup team slots
- dependency edges through `playoff_matchup_team.dependsOn`

Supported formats:

- `Top 5`: top 5 from each of 2 groups advance; creates play-in round, quarterfinals, semifinals, final.
- `Top 4`: top 4 from each of 2 groups advance; creates quarterfinals, semifinals, final.

For now, playoff generation assumes two groups in a category. We do not need a parent playoff/bracket table yet; `seasonId + categoryId` identifies a category's playoff graph.

### How to change generated names

Generated matchup names are hardcoded in `src/lib/db/queries/playoff.ts`:

- Top 4 names are in `buildTopFourTemplate`.
- Top 5 names are in `buildTopFiveTemplate`.
- Search for calls like `matchup(params, "QF 1", "quarter-final")`, `matchup(params, "M1", "play-in", 1)`, and `matchup(params, "Final", "final")`.

Generated waiting-slot labels are also in those templates:

- Search for calls like `dependencySlot(sf1.id, 0, "Winner QF 1", qf1.id)`.

Changing these labels affects newly generated graphs only. Existing rows already stored in the database will keep their current `playoff_matchup.label` and `playoff_matchup_team.label` values unless we write a migration or update query.

### How to change best-of values

Default best-of is set in the helper:

- `matchup(params, label, round, bestOf = 3)`

Specific games can override it in the templates:

- Top 5 play-in games currently use `matchup(params, "M1", "play-in", 1)` and `matchup(params, "M2", "play-in", 1)`.
- Quarterfinals, semifinals, and final currently use the default `bestOf = 3`.

To make a specific generated game best-of-5, pass `5` as the fourth argument in the relevant template. As with labels, this affects newly generated rows only.

## Current graph view

Decision: use `@xyflow/react`.

Current behavior:

- The page uses one season-wide tRPC query: `playoff.getSeasonGraphs({ seasonId })`.
- Generated categories are displayed together as separate vertical islands on one React Flow canvas.
- The canvas is intentionally sparse: a background grid and a plus button in the top right.
- The plus button opens a dialog where an admin chooses category and format (`Top 5` or `Top 4`).
- Newly generated categories appear on the canvas with deterministic category/round layout.
- Existing category graphs can be cleared from the dialog while they have no scores.
- Dependency slots render as React Flow edges from the source matchup to the target participant slot.
- Team slots use the reusable `TeamBadge` component from `src/components/schedule/team-badge.tsx`.
- The browser stores the graph viewport in `localStorage` via `src/hooks/use-graph-viewport-storage.ts`.

The graph view is still a direct representation of database state:

- nodes come from `playoff_matchup`
- participant slots come from `playoff_matchup_team`
- edges come from `playoff_matchup_team.dependsOn`
- scores come from `playoff_point`

## What is ready

- Separate playoff schema exists.
- Category playoff generation exists for Top 4 and Top 5 formats.
- Generated graph dependencies are stored explicitly.
- Admin graph visualization exists.
- Category graph clearing is protected once scores exist.
- The graph can show waiting slots structurally through edges.
- The page fetches graph data efficiently with one season-wide tRPC query.

## What is not ready yet

- Winner state is not visually indicated on graph nodes.
- Winner computation for playoff matchups is not implemented.
- Downstream slots are not automatically updated when an upstream playoff matchup has a determined winner.
- Playoff matchups are not integrated into schedule builder.
- Playoff matchups are not included in event PDF generation.
- Playoff matchups are not included in schedule image generation.
- Public pages do not yet expose a playoff graph view.
- Public schedule/standings surfaces are not yet aware of playoff matchups.
- Node positions are not persisted to the database.
- Inline label editing UI exists visually in the node area, but saving `playoff_matchup.label` is not implemented yet.

## Next steps

### 1. Playoff schedule builder

Continue expanding `/seasons/$seasonId/playoffs/build` around the shared
schedule-building workflow for playoff matchups.

Immediate behavior:

- load `playoff_schedule_event` rows for the season
- load playoff matchups into the shared schedule builder
- show a button when no playoff dates exist
- generate default dates from the last regular-season event using the Saturday,
  Saturday, Sunday pattern
- save `playoff_matchup.eventId`, `courtId`, and `slotIndex`

Next scheduling work:

- keep regular-season scheduling and playoff scheduling on separate routes while
  sharing UI primitives where practical
- decide whether playoff schedule image/PDF generation should reuse regular
  schedule exports or have separate templates

### 2. Winner state on the graph

Add winner calculation for playoff matchups and show a clear winner indicator in the graph.

Possible UI behavior:

- highlight the winning team slot inside a matchup node
- add a small `Winner` badge to the winning slot
- dim the losing slot once a winner is determined
- optionally mark the completed matchup node itself

This should be based on scores in `playoff_point` and `playoff_matchup.bestOf`.

### 3. Scorecard integration and automatic advancement

When a score is saved for a playoff matchup and a winner can be determined:

1. calculate the winner
2. find downstream `playoff_matchup_team` rows where `dependsOn` equals the completed matchup id
3. update those rows with `teamId = winnerTeamId`
4. keep or update the display label as needed
5. refetch graph data so the graph shows the advanced team

This is not ready today. The dependency structure is ready, but scorecard-driven advancement still needs to be built.

Open design question:

- Should advancement happen synchronously inside the score-saving mutation, or should it be a separate playoff service function called after score updates?

Recommendation: make a shared query/service function such as `advancePlayoffWinner(db, matchupId)` and call it from playoff score mutations. That keeps advancement rules out of UI code.

### 3. Scheduling integration

We need to decide how playoff matchups enter scheduling.

Option A: migrate regular-season scheduling toward the playoff schema.

- One unified matchup model handles regular season and playoffs.
- Schedule builder, scorecard, PDFs, image generation, and public schedule eventually read one shape.
- This is cleaner long-term, but likely touches many files because current regular-season matchups assume `teamAId` / `teamBId`.

Option B: keep playoff UI separate for now.

- Build a playoff-specific schedule builder or schedule assignment UI.
- Keep regular-season pages stable.
- Add playoff-specific PDF/image/public schedule support.
- This is safer short-term, but creates parallel workflows we may later need to merge.

Current leaning: use Option B until playoff scoring/advancement proves the data model. Revisit Option A once the playoff model is stable.

### 4. PDF and image generation

Playoff matchups need to be included in exports.

Likely work:

- event schedule PDF support for `playoff_matchup`
- team roster PDF impact, if playoff event sheets need roster context
- schedule image generation support for playoff events
- visual distinction between regular-season and playoff matches
- event pages that can contain both regular-season and playoff matchups, or separate playoff-only event pages

### 5. Public schedule and public graph

Future public-facing work:

- add a public playoff graph route
- link it from the landing page when playoffs exist
- decide Spanish copy for public playoff states
- expose playoff schedule entries on public schedule surfaces
- keep public schedule in sync when playoff events are edited

This is lower priority than admin scheduling, score entry, and PDF/image generation.

### 6. Inline editing and admin polish

Useful admin graph improvements:

- save `playoff_matchup.label` from inline edits
- save node positions to DB
- add reset-layout action
- add graph legend for waiting slots, completed matchups, and winners
- add better empty state later if desired, but keep it out of the way of the canvas

## Questions to revisit

- Should regular-season matchups migrate to the participant-row model?
- Should a `playoff_bracket` or `playoff_graph` parent table exist once we need format metadata, generated-at timestamps, or bracket-level status?
- Should playoff and regular-season events share one event table?
- Should winner advancement mutate downstream slots immediately, or derive winners dynamically at read time?
- How should forfeits, incomplete scores, and score corrections affect advancement?
