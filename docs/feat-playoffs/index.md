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
9. Link to playoff score entry at `/seasons/$seasonId/playoffs/scorecard`.

The first playoff scheduling and score-entry slices exist. The schedule route
reuses the regular-season `ScheduleBuilder` through a playoff adapter and can
create the three default playoff dates when none exist: the Saturday after the
last regular-season event, the next Saturday, and the immediate Sunday after
that second Saturday.

The shared schedule builder now creates events through a multi-date calendar
popover. This convention applies to both regular-season and playoff schedule
builders, so admins choose dates at creation time instead of creating an event
and editing its date afterward.

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
- `label` - examples: `Match 1`, `QF 1`, `Semifinal 2`, `Tercer Lugar`, `Final`
- `round` - examples: `play-in`, `quarter-final`, `semifinal`, `third-place`, `final`
- `bestOf`
- `eventId` - nullable; references `playoff_schedule_event.id`
- `courtId` - nullable
- `slotIndex` - nullable; 0-based ordering within a court on a playoff event
- `duration` - generated playoff matchups currently default to 60 minutes

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
- `dependencyType` - `winner` or `loser`; defaults to `winner`

Dependencies belong to the matchup-team row because each participant slot can have a different source. For example, one semifinal can wait on the winner of QF 1 in one row and the winner of QF 2 in another row.

The dependency model supports both normal advancement and third-place games.
Winner slots use `dependencyType = "winner"`. Third-place slots use
`dependencyType = "loser"` and wait for the losers of the two semifinals.

Automatic winner/loser propagation now happens when playoff set scores are
saved. If the source matchup is incomplete, dependent winner and loser slots are
cleared back to `null`.

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
- dependency result type through `playoff_matchup_team.dependencyType`

Supported formats:

- `Top 5`: top 5 from each of 2 groups advance; creates play-in round, quarterfinals, semifinals, third-place, and final.
- `Top 4`: top 4 from each of 2 groups advance; creates quarterfinals, semifinals, third-place, and final.

Third-place games are always generated. They are part of the playoff structure,
not an optional format flag. Both Top 4 and Top 5 eventually produce two
semifinals; the final receives the two semifinal winners, and `Tercer Lugar`
receives the two semifinal losers.

For now, playoff generation assumes two groups in a category. We do not need a parent playoff/bracket table yet; `seasonId + categoryId` identifies a category's playoff graph.

### How to change generated names

Generated matchup names are hardcoded in `src/lib/db/queries/playoff.ts`:

- Top 4 names are in `buildTopFourTemplate`.
- Top 5 names are in `buildTopFiveTemplate`.
- Search for calls like `matchup(params, "QF 1", "quarter-final")`, `matchup(params, "Match 1", "play-in", 2)`, `matchup(params, "Semifinal 1", "semifinal")`, `matchup(params, "Tercer Lugar", "third-place")`, and `matchup(params, "Final", "final")`.

Generated waiting-slot labels are also in those templates:

- Search for calls like `dependencySlot(sf1.id, 0, "Winner QF 1", qf1.id)`.
- Third-place slots use labels like `Loser Semifinal 1` with
  `dependencyType = "loser"`.

Changing these labels affects newly generated graphs only. Existing rows already stored in the database will keep their current `playoff_matchup.label` and `playoff_matchup_team.label` values unless we write a migration or update query.

### How to change best-of values

Default best-of is set in the helper:

- `matchup(params, label, round, bestOf = 3)`

Specific games can override it in the templates:

- Top 5 play-in games currently use `matchup(params, "Match 1", "play-in", 2)` and `matchup(params, "Match 2", "play-in", 2)`.
- Quarterfinals, semifinals, third-place, and final currently use the default `bestOf = 3`.

To make a specific generated game best-of-5, pass `5` as the fourth argument in the relevant template. As with labels, this affects newly generated rows only.

### How to change durations

Generated playoff matchup duration is set in the helper:

- `matchup(params, label, round, bestOf = 3)` currently writes `duration: 60`.

The schema default for `playoff_matchup.duration` is also 60 minutes.

## Current graph view

Decision: use `@xyflow/react`.

Current behavior:

- The page uses one season-wide tRPC query: `playoff.getSeasonGraphs({ seasonId })`.
- Generated categories are displayed together as separate vertical islands on one React Flow canvas.
- The canvas is intentionally sparse: a background grid and a plus button in the top right.
- The plus button opens a dialog where an admin chooses category and format (`Top 5` or `Top 4`).
- Newly generated categories appear on the canvas with deterministic category/round layout.
- The deterministic layout uses separate columns for play-ins, quarterfinals,
  semifinals, `Tercer Lugar`, and `Final`.
- Semifinals are centered between the two quarterfinals that feed them.
- `Tercer Lugar` and `Final` are centered vertically between the two semifinals,
  with `Tercer Lugar` in the column before `Final`.
- Existing category graphs can be cleared from the dialog while they have no scores.
- Dependency slots render as React Flow edges from the source matchup to the target participant slot.
- Winner and loser source handles both leave from the right side of a matchup
  node. Loser edges are visually distinct from winner edges.
- Matchup nodes can be dragged locally while exploring layout, but those
  positions are not persisted.
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
- Third-place games are generated for both Top 4 and Top 5 formats.
- Participant dependencies can advance either winners or losers.
- Admin graph visualization exists.
- Category graph clearing is protected once scores exist.
- The graph can show waiting slots structurally through edges.
- Winner calculation for playoff matchups exists in
  `src/lib/playoffs/winner.ts`.
- Winner state is visually indicated on graph nodes by giving the winning team
  slot a green border.
- Playoff score entry exists at `/seasons/$seasonId/playoffs/scorecard`.
- Saving a playoff set score upserts `playoff_point`, recomputes the matchup
  winner/loser, and updates downstream `playoff_matchup_team` dependency slots
  with the correct `teamId` based on `dependencyType`.
- The page fetches graph data efficiently with one season-wide tRPC query.
- Playoff matchups are integrated into the shared schedule builder route at
  `/seasons/$seasonId/playoffs/build`.
- Playoff schedule placements save `eventId`, `courtId`, and `slotIndex` on
  `playoff_matchup`.
- Playoff event PDF export exists at `/api/playoff-event-pdf` and is linked
  from the playoff schedule builder as `Playoff PDF`.
- Playoff auto-scheduling treats `third-place` as a late round. For the current
  hard-coded Varonil Libre final-day program, `Tercer Lugar` is placed before
  `Final`.

## What is not ready yet

- Playoff matchups are not included in schedule image generation.
- Public pages do not yet expose a playoff graph view.
- Public schedule/standings surfaces are not yet aware of playoff matchups.
- Node positions are not persisted to the database.
- Inline label editing UI exists visually in the node area, but saving `playoff_matchup.label` is not implemented yet.
- There are not yet focused tests for third-place template generation or
  winner/loser dependency propagation.

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
- generate playoff schedule placements in round/dependency order: play-ins and
  quarterfinals on the first playoff event, semifinals on the second event, and
  third-place/finals on the third event when those dates exist

Next scheduling work:

- keep regular-season scheduling and playoff scheduling on separate routes while
  sharing UI primitives where practical
- decide whether playoff schedule image/PDF generation should reuse regular
  schedule exports or have separate templates

### 2. Scheduling integration

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

### 3. Image generation and export polish

Playoff event PDF export exists, but playoff exports still need polish and image
support.

Likely work:

- refine playoff event PDF layout if playoff-specific visual treatment is needed
- team roster PDF impact, if playoff event sheets need roster context
- schedule image generation support for playoff events
- visual distinction between regular-season and playoff matches
- event pages that can contain both regular-season and playoff matchups, or separate playoff-only event pages

### 4. Public schedule and public graph

Future public-facing work:

- add a public playoff graph route
- link it from the landing page when playoffs exist
- decide Spanish copy for public playoff states
- expose playoff schedule entries on public schedule surfaces
- keep public schedule in sync when playoff events are edited

This is lower priority than admin scheduling, score entry, and PDF/image generation.

### 5. Inline editing and admin polish

Useful admin graph improvements:

- save `playoff_matchup.label` from inline edits
- save node positions to DB
- add reset-layout action
- add graph legend for waiting slots and winners, if the graph needs one later
- add better empty state later if desired, but keep it out of the way of the canvas
- add focused tests around Top 4/Top 5 third-place generation and loser
  propagation

## Questions to revisit

- Should regular-season matchups migrate to the participant-row model?
- Should a `playoff_bracket` or `playoff_graph` parent table exist once we need format metadata, generated-at timestamps, or bracket-level status?
- Should playoff and regular-season events share one event table?
- How should score corrections that change a winner affect downstream matchups
  after those downstream matchups already have scores?
- How should forfeits, incomplete scores, and score corrections affect advancement?
