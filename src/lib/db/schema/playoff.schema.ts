import { relations } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { category, season, team } from "./team.schema";

export const playoffScheduleEvent = sqliteTable("playoff_schedule_event", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(),
  seasonId: text("season_id")
    .notNull()
    .references(() => season.id, { onDelete: "cascade" }),
});

export const playoffMatchup = sqliteTable("playoff_matchup", {
  id: text("id").primaryKey(),
  seasonId: text("season_id")
    .notNull()
    .references(() => season.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => category.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  round: text("round").notNull(),
  bestOf: integer("best_of").notNull().default(3),
  eventId: text("event_id").references(() => playoffScheduleEvent.id, {
    onDelete: "set null",
  }),
  courtId: text("court_id"),
  slotIndex: integer("slot_index"),
  duration: integer("duration").notNull().default(60),
});

export const playoffMatchupTeam = sqliteTable("playoff_matchup_team", {
  id: text("id").primaryKey(),
  matchupId: text("matchup_id")
    .notNull()
    .references(() => playoffMatchup.id, { onDelete: "cascade" }),
  slotIndex: integer("slot_index").notNull(),
  teamId: text("team_id").references(() => team.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  dependsOn: text("depends_on").references(() => playoffMatchup.id, {
    onDelete: "set null",
  }),
  dependencyType: text("dependency_type").notNull().default("winner"),
});

export const playoffPoint = sqliteTable(
  "playoff_point",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    seasonId: text("season_id")
      .notNull()
      .references(() => season.id, { onDelete: "cascade" }),
    matchupId: text("matchup_id")
      .notNull()
      .references(() => playoffMatchup.id, { onDelete: "cascade" }),
    set: integer("set").notNull().default(1),
    points: integer("points").notNull(),
  },
  (t) => [primaryKey({ columns: [t.matchupId, t.teamId, t.set] })],
);

export const playoffScheduleEventRelations = relations(
  playoffScheduleEvent,
  ({ one, many }) => ({
    season: one(season, {
      fields: [playoffScheduleEvent.seasonId],
      references: [season.id],
    }),
    matchups: many(playoffMatchup),
  }),
);

export const playoffMatchupRelations = relations(playoffMatchup, ({ one, many }) => ({
  season: one(season, {
    fields: [playoffMatchup.seasonId],
    references: [season.id],
  }),
  category: one(category, {
    fields: [playoffMatchup.categoryId],
    references: [category.id],
  }),
  event: one(playoffScheduleEvent, {
    fields: [playoffMatchup.eventId],
    references: [playoffScheduleEvent.id],
  }),
  teams: many(playoffMatchupTeam),
  points: many(playoffPoint),
}));

export const playoffMatchupTeamRelations = relations(playoffMatchupTeam, ({ one }) => ({
  matchup: one(playoffMatchup, {
    fields: [playoffMatchupTeam.matchupId],
    references: [playoffMatchup.id],
  }),
  team: one(team, {
    fields: [playoffMatchupTeam.teamId],
    references: [team.id],
  }),
  dependency: one(playoffMatchup, {
    fields: [playoffMatchupTeam.dependsOn],
    references: [playoffMatchup.id],
    relationName: "playoffMatchupDependency",
  }),
}));

export const playoffPointRelations = relations(playoffPoint, ({ one }) => ({
  team: one(team, {
    fields: [playoffPoint.teamId],
    references: [team.id],
  }),
  matchup: one(playoffMatchup, {
    fields: [playoffPoint.matchupId],
    references: [playoffMatchup.id],
  }),
  season: one(season, {
    fields: [playoffPoint.seasonId],
    references: [season.id],
  }),
}));
