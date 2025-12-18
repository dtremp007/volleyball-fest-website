import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { season, team } from "./team.schema";

export const scheduleEvent = sqliteTable("schedule_event", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
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
});

// Relations
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
