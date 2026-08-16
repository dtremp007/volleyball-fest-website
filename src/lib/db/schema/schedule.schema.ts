import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { season, team } from "./team.schema";

export const schedulePreset = sqliteTable("schedule_preset", {
  id: text("id").primaryKey(),
  seasonId: text("season_id")
    .notNull()
    .references(() => season.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  weightsJson: text("weights_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const scheduleDraft = sqliteTable("schedule_draft", {
  id: text("id").primaryKey(),
  seasonId: text("season_id")
    .notNull()
    .references(() => season.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  presetName: text("preset_name"),
  weightsJson: text("weights_json").notNull(),
  seed: integer("seed").notNull(),
  placementsJson: text("placements_json").notNull(),
  metricsJson: text("metrics_json").notNull(),
  unscheduledCount: integer("unscheduled_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const scheduleConfig = sqliteTable("schedule_config", {
  id: text("id").primaryKey(),
  seasonId: text("season_id")
    .notNull()
    .references(() => season.id, { onDelete: "cascade" })
    .unique(),
  defaultStartTime: text("default_start_time").notNull(), // e.g., "4:00 PM"
  gamesPerEvening: integer("games_per_evening").notNull().default(4),
  activePresetId: text("active_preset_id").references(() => schedulePreset.id, {
    onDelete: "set null",
  }),
});

export const scheduleEvent = sqliteTable("schedule_event", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(), // YYYY-MM-DD format
  seasonId: text("season_id")
    .notNull()
    .references(() => season.id, { onDelete: "cascade" }),
});

export const matchup = sqliteTable("matchup", {
  id: text("id").primaryKey(),
  teamAId: text("team_a_id")
    .notNull()
    .references(() => team.id, { onDelete: "cascade" }),
  teamBId: text("team_b_id")
    .notNull()
    .references(() => team.id, { onDelete: "cascade" }),
  seasonId: text("season_id")
    .notNull()
    .references(() => season.id, { onDelete: "cascade" }),
  // Scheduling fields - null means unscheduled
  eventId: text("event_id").references(() => scheduleEvent.id, { onDelete: "set null" }),
  courtId: text("court_id"), // 'A' or 'B', null if unscheduled
  slotIndex: integer("slot_index"), // 0-based index for time slot, null if unscheduled
  duration: integer("duration").notNull().default(45), // in minutes
  bestOf: integer("best_of").notNull().default(3),
});

// Relations
export const schedulePresetRelations = relations(schedulePreset, ({ one, many }) => ({
  season: one(season, {
    fields: [schedulePreset.seasonId],
    references: [season.id],
  }),
  activeConfigs: many(scheduleConfig),
}));

export const scheduleDraftRelations = relations(scheduleDraft, ({ one }) => ({
  season: one(season, {
    fields: [scheduleDraft.seasonId],
    references: [season.id],
  }),
}));

export const scheduleConfigRelations = relations(scheduleConfig, ({ one }) => ({
  season: one(season, {
    fields: [scheduleConfig.seasonId],
    references: [season.id],
  }),
  activePreset: one(schedulePreset, {
    fields: [scheduleConfig.activePresetId],
    references: [schedulePreset.id],
  }),
}));

export const scheduleEventRelations = relations(scheduleEvent, ({ one, many }) => ({
  season: one(season, {
    fields: [scheduleEvent.seasonId],
    references: [season.id],
  }),
  matchups: many(matchup),
}));

export const matchupRelations = relations(matchup, ({ one }) => ({
  teamA: one(team, {
    fields: [matchup.teamAId],
    references: [team.id],
    relationName: "teamA",
  }),
  teamB: one(team, {
    fields: [matchup.teamBId],
    references: [team.id],
    relationName: "teamB",
  }),
  season: one(season, {
    fields: [matchup.seasonId],
    references: [season.id],
  }),
  event: one(scheduleEvent, {
    fields: [matchup.eventId],
    references: [scheduleEvent.id],
  }),
}));
