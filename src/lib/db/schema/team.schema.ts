import { relations } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { matchup } from "./schedule.schema";

export const seasonStateEnum = [
  "draft",
  "signup_open",
  "signup_closed",
  "active",
  "completed",
] as const;
export type SeasonState = (typeof seasonStateEnum)[number];

export const season = sqliteTable("season", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  state: text("state").notNull().$type<SeasonState>().default("draft"),
});

export const category = sqliteTable("category", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
});

export const group = sqliteTable("group", {
  id: text("id").primaryKey(),
  name: text("name").notNull(), // e.g., "A", "B", "C"
  seasonId: text("season_id")
    .notNull()
    .references(() => season.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => category.id, { onDelete: "cascade" }),
});

export const seasonTeam = sqliteTable(
  "season_team",
  {
    seasonId: text("season_id").references(() => season.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => team.id, { onDelete: "cascade" }),
    groupId: text("group_id").references(() => group.id, { onDelete: "set null" }),
  },
  (t) => [primaryKey({ columns: [t.seasonId, t.teamId] })],
);

export const team = sqliteTable("team", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url").notNull(),
  categoryId: text("category_id").references(() => category.id, { onDelete: "cascade" }),
  captainName: text("captain_name").notNull(),
  captainPhone: text("captain_phone").notNull(),
  coCaptainName: text("co_captain_name").notNull(),
  coCaptainPhone: text("co_captain_phone").notNull(),
  unavailableDates: text("unavailable_dates").notNull(),
  comingFrom: text("coming_from").notNull(),
  notes: text("notes"),
});

export const player = sqliteTable("player", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  jerseyNumber: text("jersey_number").notNull(),
  positionId: text("position_id").references(() => position.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => team.id, { onDelete: "cascade" }),
});

export const position = sqliteTable("position", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const points = sqliteTable("points", {
  id: text("id").primaryKey(),
  teamId: text("team_id").references(() => team.id, { onDelete: "cascade" }),
  seasonId: text("season_id").references(() => season.id, { onDelete: "cascade" }),
  matchupId: text("matchup_id").references(() => matchup.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
});

// Relations

export const groupRelations = relations(group, ({ one, many }) => ({
  season: one(season, {
    fields: [group.seasonId],
    references: [season.id],
  }),
  category: one(category, {
    fields: [group.categoryId],
    references: [category.id],
  }),
  seasonTeams: many(seasonTeam),
}));

export const seasonTeamRelations = relations(seasonTeam, ({ one }) => ({
  season: one(season, {
    fields: [seasonTeam.seasonId],
    references: [season.id],
  }),
  team: one(team, {
    fields: [seasonTeam.teamId],
    references: [team.id],
  }),
  group: one(group, {
    fields: [seasonTeam.groupId],
    references: [group.id],
  }),
}));

export const teamRelations = relations(team, ({ many, one }) => ({
  seasonTeams: many(seasonTeam),
  players: many(player),
  category: one(category, {
    fields: [team.categoryId],
    references: [category.id],
  }),
}));

export const categoryRelations = relations(category, ({ many }) => ({
  teams: many(team),
  groups: many(group),
}));

export const positionRelations = relations(position, ({ many }) => ({
  players: many(player),
}));

export const playerRelations = relations(player, ({ one }) => ({
  position: one(position, {
    fields: [player.positionId],
    references: [position.id],
  }),
  team: one(team, {
    fields: [player.teamId],
    references: [team.id],
  }),
}));

export const pointsRelations = relations(points, ({ one }) => ({
  team: one(team, {
    fields: [points.teamId],
    references: [team.id],
  }),
  matchup: one(matchup, {
    fields: [points.matchupId],
    references: [matchup.id],
  }),
  season: one(season, {
    fields: [points.seasonId],
    references: [season.id],
  }),
}));
