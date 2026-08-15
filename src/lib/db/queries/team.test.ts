import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "~/lib/db";
import * as schema from "~/lib/db/schema";
import {
  copyTeamsToSeason,
  createTeamRegistration,
  getTeamForSeason,
  removeTeamFromSeason,
  updateTeamForSeason,
} from "./team";

let client: ReturnType<typeof createClient>;
let db: Database;
let testDirectory: string;

const registration = {
  name: "Set Squad",
  logoUrl: "",
  categoryId: "category",
  captainName: "Alex",
  captainPhone: "6251234567",
  coCaptainName: "Sam",
  coCaptainPhone: "6257654321",
  unavailableDates: "",
  comingFrom: "Cuauhtémoc",
  isFarAway: false,
  notes: "Original",
  players: [{ name: "Alex", jerseyNumber: "7", positionId: "setter" }],
};

beforeEach(async () => {
  testDirectory = mkdtempSync(join(tmpdir(), "vf-team-test-"));
  client = createClient({
    url: `file:${join(testDirectory, "database.sqlite")}`,
  });
  await client.executeMultiple(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE season (id text PRIMARY KEY, name text NOT NULL, start_date text NOT NULL, end_date text NOT NULL, state text DEFAULT 'draft');
    CREATE TABLE category (id text PRIMARY KEY, name text NOT NULL, description text NOT NULL, playoff_format text DEFAULT 'top-4' NOT NULL, color text DEFAULT '#374151' NOT NULL);
    CREATE TABLE position (id text PRIMARY KEY, name text NOT NULL);
    CREATE TABLE team_group (id text PRIMARY KEY, name text NOT NULL, season_id text NOT NULL, category_id text NOT NULL);
    CREATE TABLE team (id text PRIMARY KEY);
    CREATE TABLE season_team (season_id text NOT NULL, team_id text NOT NULL, group_id text, name text NOT NULL, logo_url text NOT NULL, category_id text, captain_name text NOT NULL, captain_phone text NOT NULL, co_captain_name text NOT NULL, co_captain_phone text NOT NULL, unavailable_dates text NOT NULL, coming_from text NOT NULL, is_far_away integer DEFAULT 0 NOT NULL, notes text, PRIMARY KEY (season_id, team_id), FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE);
    CREATE TABLE player (id text PRIMARY KEY, name text NOT NULL, jersey_number text NOT NULL, position_id text, team_id text NOT NULL, season_id text NOT NULL, FOREIGN KEY (season_id, team_id) REFERENCES season_team(season_id, team_id) ON DELETE CASCADE);
    CREATE TABLE schedule_event (id text PRIMARY KEY, name text NOT NULL, start_time text NOT NULL, season_id text NOT NULL);
    CREATE TABLE matchup (id text PRIMARY KEY, team_a_id text NOT NULL, team_b_id text NOT NULL, season_id text NOT NULL, event_id text, court_id text, slot_index integer, duration integer DEFAULT 45 NOT NULL, best_of integer DEFAULT 3 NOT NULL);
    CREATE TABLE playoff_matchup (id text PRIMARY KEY, season_id text NOT NULL, category_id text NOT NULL, label text NOT NULL, round text NOT NULL, best_of integer DEFAULT 3 NOT NULL, event_id text, court_id text, slot_index integer, duration integer DEFAULT 60 NOT NULL);
    CREATE TABLE playoff_matchup_team (id text PRIMARY KEY, matchup_id text NOT NULL, slot_index integer NOT NULL, team_id text, label text NOT NULL, depends_on text, dependency_type text DEFAULT 'winner' NOT NULL);
    INSERT INTO season VALUES ('source', 'Source', '2026-01-01', '2026-06-01', 'completed');
    INSERT INTO season VALUES ('target', 'Target', '2027-01-01', '2027-06-01', 'draft');
    INSERT INTO category VALUES ('category', 'Mixed', 'Mixed league', 'top-4');
    INSERT INTO position VALUES ('setter', 'Setter');
  `);
  db = drizzle({ client, schema, casing: "snake_case" }) as unknown as Database;
});

afterEach(() => {
  client.close();
  rmSync(testDirectory, { recursive: true, force: true });
});

describe("season team snapshots", () => {
  it("copies idempotently and edits each season independently", async () => {
    const created = await createTeamRegistration(db, "source", registration);
    expect(await copyTeamsToSeason(db, "source", "target", [created.id])).toEqual({
      count: 1,
    });
    expect(await copyTeamsToSeason(db, "source", "target", [created.id])).toEqual({
      count: 0,
    });

    await updateTeamForSeason(db, "target", created.id, {
      ...registration,
      name: "Set Squad 2027",
      notes: "New season",
    });

    expect((await getTeamForSeason(db, "source", created.id))?.name).toBe("Set Squad");
    expect((await getTeamForSeason(db, "target", created.id))?.name).toBe(
      "Set Squad 2027",
    );
  });

  it("blocks removal while a season schedule references the team", async () => {
    const first = await createTeamRegistration(db, "source", registration);
    const second = await createTeamRegistration(db, "source", {
      ...registration,
      name: "Block Party",
    });
    await client.execute({
      sql: "INSERT INTO matchup (id, team_a_id, team_b_id, season_id) VALUES (?, ?, ?, ?)",
      args: ["match", first.id, second.id, "source"],
    });

    await expect(removeTeamFromSeason(db, "source", first.id)).rejects.toThrow(
      "used by the season schedule",
    );
  });
});
