# Volleyball Fest — Season-Centered Admin Handoff

## Workspace state

- Repository: `/Users/david/Documents/Projects/volleyball-fest/volleyball-fest-website-2`
- Branch: `main`
- Nothing has been staged, committed, pushed, or opened as a PR.
- The worktree contains the complete season-centered admin implementation plus migration metadata changes. Use `git status --short` and `git diff` for the authoritative file list.
- Preserve all existing changes. In particular, `sqlite.db` is a tracked binary file that is currently modified; its change was not intentionally reverted or attributed during this work.
- Follow `AGENTS.md` at the repository root. It says not to commit directly to `main`; create a `codex/*` feature branch before publishing if the user requests that.

## What was implemented

The requested “Season-Centered Admin and Team Editing” plan is implemented in the worktree:

- Authenticated pages use a dedicated English admin shell with a season switcher and sticky season workflow navigation.
- `/admin` restores the last valid season and falls back to the newest non-completed season.
- `/seasons` is the authoritative season directory; `/seasons/new` creates and selects a draft season. Season management was removed from global Settings.
- Direct invalid/deleted season URLs redirect to `/seasons` with a visible notification.
- Public pages resolve a competition season independently from a signup-open registration season.
- Public registration is create-only and cannot submit when registration is closed.
- The hardcoded `season-2026-spring` dependencies were removed.
- Team identity is stable while mutable team details and rosters are season snapshots.
- Admin team reads, edits, copies, removals, roster mutations, and PDFs are scoped by both `seasonId` and `teamId`.
- The team drawer now has complete inline English read/edit states, dirty-close confirmation, field/server errors, responsive full-screen behavior, and sticky Save/Cancel controls.
- Season state can no longer be passed through generic create/update APIs; all state changes go through guarded transitions.

Key implementation files:

- `src/components/admin/admin-header.tsx`
- `src/components/tables/teams/team-details-drawer.tsx`
- `src/lib/season-navigation.ts`
- `src/lib/db/schema/team.schema.ts`
- `src/lib/db/queries/team.ts`
- `src/lib/db/queries/season.ts`
- `src/trpc/router/team.trpc.ts`
- `src/trpc/router/season.trpc.ts`
- `src/routes/(authenticated)/admin.tsx`
- `src/routes/(authenticated)/seasons/new.tsx`
- `src/routes/signup-form.tsx`

## Migration history and database state

The local `.env` resolves `DATABASE_URL` to the local `playoffs.db` file. No secrets were copied into this handoff.

Diagnosis found that migrations `0001–0005` were physically reflected in `playoffs.db`, but Drizzle’s journal only recorded the earliest history. The repository metadata was repaired:

- `drizzle/meta/_journal.json` now lists `0000–0006`.
- `drizzle/meta/0006_snapshot.json` represents the current 20-table schema.
- A temporary Drizzle generation check returned “No schema changes, nothing to migrate.”

`drizzle/0006_season_team_snapshots.sql` was repaired before use:

- Foreign keys reference final table names rather than `__new_*` names.
- Direct SQLite application is wrapped in `BEGIN IMMEDIATE`/`COMMIT` with foreign keys disabled outside the transaction.
- The migration test asserts that no foreign key references a temporary table.

The repaired migration was rehearsed on a WAL-aware copy and then applied to `playoffs.db`. The database migration table now has:

- Baseline through `0005`: hash `81fefc3518237075a44a9ad6263286b3368a935d0152d7c0a2885a6016770c94`, timestamp `1780181914000`.
- Applied `0006`: hash `3f39b6da624a6d8789a2da4f16220d3bb45e5407111d2b1f291c8682cfb4b37a`, timestamp `1784668053453`.

Post-migration validation of `playoffs.db`:

- SQLite integrity: `ok`
- Foreign-key errors: `0`
- Teams: `48`
- Season registrations: `48`
- Players: `440`
- Orphan players: `0`
- Snapshot mismatches against the backup: `0`
- Player mismatches against the backup: `0`
- Regular matchup/point count deltas: `0`
- Playoff matchup/team/point count deltas: `0`
- Leftover `__new_*` tables: `0`
- Physical `team` table now has only its `id` column.

Recovery backup:

- `/Users/david/Documents/Projects/volleyball-fest/volleyball-fest-website-2/playoffs.backup-before-season-snapshots-2026-07-21.db`
- This was produced with SQLite’s online `.backup` mechanism so it includes WAL state consistently.
- It is ignored by Git because it ends in `.db`.
- An earlier incomplete plain-copy backup was deleted after the WAL issue was discovered.

Important rollout caveat: `0006` was applied locally with the SQLite CLI, not with `drizzle-kit migrate`. It contains explicit transaction control and `PRAGMA foreign_keys`, while Drizzle’s SQLite ORM migrator normally wraps migrations in its own transaction. Do not blindly run the standard migrator against another existing database. For Turso/production, first make a verified backup, confirm the schema is already at `0005`, rehearse on a copy, baseline the migration history, and use a migration path that preserves the foreign-key/transaction ordering.

## Verification completed

- Full Vitest suite: 8 files, 33 tests passed.
- Targeted migration/database suite was rerun after applying the migration: 3 files, 5 tests passed.
- `pnpm check-types`: passed.
- `pnpm build`: passed, with only the existing large-chunk warning.
- `git diff --check`: passed.
- Browser QA was explicitly skipped at the user’s request.
- Repository-wide `pnpm lint` still fails with 10 pre-existing errors in unrelated shared components/hooks (`navigation-progress`, matchup drawer, calendar/field primitives, and `use-table-scroll`). The changed implementation files were linted separately without errors. Consequently, the composite `pnpm check` command is not green.

## Recommended next steps

1. Inspect the unexplained tracked change to `sqlite.db` before staging anything; do not discard it automatically.
2. If UI validation is desired, start the app with the project environment loaded and smoke-test public Spanish pages plus authenticated English season switching/team editing. Previous production-server smoke attempts did not auto-load `.env`; `pnpm dev` is the normal local path.
3. Decide whether to address the repository’s pre-existing lint failures or document them as baseline debt.
4. Create a `codex/*` feature branch before committing, then review the complete diff and migration/backup paths.
5. Treat production/Turso migration as a separate coordinated rollout. Do not run `pnpm db push` for the snapshot migration.

## Suggested skills

- `diagnose` — use for any migration-history, database, or runtime discrepancy; preserve the backup and build a copy-based repro first.
- `impeccable` — use for follow-up admin UI polish, responsive review, or accessibility work.
- `browser:control-in-app-browser` — use only if the user wants localhost UI smoke testing.
- `github:yeet` — use only if the user explicitly asks to branch, commit, push, and open a draft PR.

