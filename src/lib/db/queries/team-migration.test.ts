import { createClient } from "@libsql/client";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let client: ReturnType<typeof createClient>;
let testDirectory: string;

beforeEach(async () => {
  testDirectory = mkdtempSync(join(tmpdir(), "vf-team-migration-test-"));
  client = createClient({ url: `file:${join(testDirectory, "database.sqlite")}` });

  await client.executeMultiple(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE season (id text PRIMARY KEY, name text NOT NULL);
    CREATE TABLE category (id text PRIMARY KEY, name text NOT NULL);
    CREATE TABLE position (id text PRIMARY KEY, name text NOT NULL);
    CREATE TABLE team_group (id text PRIMARY KEY, name text NOT NULL, season_id text NOT NULL, category_id text NOT NULL);
    CREATE TABLE team (
      id text PRIMARY KEY,
      name text NOT NULL,
      logo_url text NOT NULL,
      category_id text,
      captain_name text NOT NULL,
      captain_phone text NOT NULL,
      co_captain_name text NOT NULL,
      co_captain_phone text NOT NULL,
      unavailable_dates text NOT NULL,
      coming_from text NOT NULL,
      is_far_away integer DEFAULT 0 NOT NULL,
      notes text
    );
    CREATE TABLE season_team (
      season_id text NOT NULL,
      team_id text NOT NULL,
      group_id text,
      PRIMARY KEY (season_id, team_id)
    );
    CREATE TABLE player (
      id text PRIMARY KEY,
      name text NOT NULL,
      jersey_number text NOT NULL,
      position_id text,
      team_id text NOT NULL
    );
    INSERT INTO season VALUES ('spring', 'Spring');
    INSERT INTO season VALUES ('fall', 'Fall');
    INSERT INTO category VALUES ('mixed', 'Mixed');
    INSERT INTO position VALUES ('setter', 'Setter');
    INSERT INTO team VALUES (
      'shared-team', 'Original Name', '/logo.png', 'mixed', 'Alex', '6251234567',
      'Sam', '6257654321', '2026-02-01', 'Cuauhtémoc', 1, 'Original notes'
    );
    INSERT INTO season_team VALUES ('spring', 'shared-team', NULL);
    INSERT INTO season_team VALUES ('fall', 'shared-team', NULL);
    INSERT INTO player VALUES ('player-1', 'Alex', '7', 'setter', 'shared-team');
  `);
});

afterEach(() => {
  client.close();
  rmSync(testDirectory, { recursive: true, force: true });
});

describe("season team snapshot migration", () => {
  it("copies shared team details and rosters into each season", async () => {
    const migration = readFileSync(
      join(process.cwd(), "drizzle/0006_season_team_snapshots.sql"),
      "utf8",
    ).replaceAll("--> statement-breakpoint", "");

    expect(migration).not.toMatch(/REFERENCES `__new_/);

    await client.executeMultiple(migration);

    const registrations = await client.execute(
      "SELECT season_id, team_id, name, captain_name FROM season_team ORDER BY season_id",
    );
    expect(registrations.rows).toHaveLength(2);
    expect(registrations.rows.map((row) => row.name)).toEqual([
      "Original Name",
      "Original Name",
    ]);

    const players = await client.execute(
      "SELECT id, season_id, team_id, name FROM player ORDER BY season_id",
    );
    expect(players.rows).toHaveLength(2);
    expect(players.rows.map((row) => row.season_id)).toEqual(["fall", "spring"]);
    expect(new Set(players.rows.map((row) => row.id)).size).toBe(2);

    const foreignKeyErrors = await client.execute("PRAGMA foreign_key_check");
    expect(foreignKeyErrors.rows).toHaveLength(0);
  });
});
