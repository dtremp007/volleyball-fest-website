import { relations } from "drizzle-orm";
import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const seasonStateEnum = ["draft", "signup_open", "signup_closed", "active", "completed"] as const;
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

export const seasonTeam = sqliteTable(
  "season_team",
  {
    seasonId: text("season_id").references(() => season.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => team.id, { onDelete: "cascade" }),
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

// Relations

export const seasonTeamRelations = relations(seasonTeam, ({ one }) => ({
  season: one(season, {
    fields: [seasonTeam.seasonId],
    references: [season.id],
  }),
  team: one(team, {
    fields: [seasonTeam.teamId],
    references: [team.id],
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
