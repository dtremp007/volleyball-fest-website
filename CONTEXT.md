# Volleyball Fest

Web app for running a recreational volleyball league: public schedule/standings and admin season workflow (signup → groups → matchups → schedule → scores).

## Language

### Season workflow

**Season**:
A league period with lifecycle states (`draft` → `signup_open` → `signup_closed` → `active` → `completed`).
_Avoid_: tournament, edition (unless referring to something else).

**Schedule Event**:
A game night (date + display name) that holds multiple matchup placements across courts.
_Avoid_: game day, session (ambiguous with auth).

**Matchup**:
Two teams scheduled to play each other; may be unscheduled or placed on a Schedule Event.
_Avoid_: game, match (too generic).

**Court**:
One of two parallel playing surfaces for a Schedule Event, identified as `A` or `B`.
_Avoid_: field, lane.

**Slot index**:
Zero-based position of a matchup within a court’s ordered list for an event; determines save payload and display order. Display times are derived from slot index (not stored per slot in v1).
_Avoid_: time slot (ambiguous with clock time).

### Schedule builder package

**Schedule Builder**:
In-repo UI module for drag-and-drop placement of matchups onto Schedule Events and courts. Owns DnD, local edit state, and autosave behaviour; does not call tRPC directly.
_Avoid_: schedule builder page (that name is reserved for the route host).

**Schedule Builder State**:
Nested data the builder needs to initialise: `events` (with courts and matchups), `unscheduledMatchups`, `matchupsByCategory`, plus a server `revision` for reset semantics.
_Avoid_: initialState (fine as a prop name, not a domain term).

**Schedule Builder Snapshot**:
Nested state exported across the save seam when persisting; host maps it to flat placement rows for `saveSchedule`.
_Avoid_: DTO, payload (too generic).

**Build schedule route**:
The `/seasons/$seasonId/build` page loads `getScheduleBuilderState`, handles empty “no matchups”, wires `onSave` to tRPC, and injects toolbar actions (e.g. Regenerate) into `ScheduleBuilder`.
_Avoid_: BuildScheduleHost (logic lives on the route, not a shared host component).

**Placement revision**:
Opaque string from the server hashing current matchup placements; when it changes after refetch/regenerate, the host remounts or re-inits the builder so local edits do not fight server truth.
_Avoid_: dataKey, version (too generic).

## Flagged ambiguities

- **“Event”** in code sometimes means `schedule_event` (game night) and sometimes a DOM/event-handler concept. In domain discussion, say **Schedule Event**.

## Example dialogue

**Admin:** After I hit Regenerate on Build Schedule, do we keep my drag-and-drop changes?

**Dev:** No. Regenerate runs on the server, returns a new **placement revision**, and the **build schedule route** remounts the **Schedule Builder** with fresh **Schedule Builder State**. Your unsaved pool moves are discarded — same as today, but the reset key is explicit.

**Admin:** Where does “saved” go?

**Dev:** The builder calls `onSave` with a **Schedule Builder Snapshot** every few seconds when dirty. The host flattens that to court/slot rows for `saveSchedule`. The builder never knows about Turso.
