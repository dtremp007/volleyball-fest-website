PRAGMA foreign_keys=OFF;
--> statement-breakpoint
BEGIN IMMEDIATE;
--> statement-breakpoint
CREATE TABLE `__new_team` (
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_team` (`id`) SELECT `id` FROM `team`;
--> statement-breakpoint
CREATE TABLE `__new_season_team` (
	`season_id` text NOT NULL,
	`team_id` text NOT NULL,
	`group_id` text,
	`name` text NOT NULL,
	`logo_url` text NOT NULL,
	`category_id` text,
	`captain_name` text NOT NULL,
	`captain_phone` text NOT NULL,
	`co_captain_name` text NOT NULL,
	`co_captain_phone` text NOT NULL,
	`unavailable_dates` text NOT NULL,
	`coming_from` text NOT NULL,
	`is_far_away` integer DEFAULT 0 NOT NULL,
	`notes` text,
	PRIMARY KEY(`season_id`, `team_id`),
	FOREIGN KEY (`season_id`) REFERENCES `season`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `team_group`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_season_team` (
	`season_id`, `team_id`, `group_id`, `name`, `logo_url`, `category_id`,
	`captain_name`, `captain_phone`, `co_captain_name`, `co_captain_phone`,
	`unavailable_dates`, `coming_from`, `is_far_away`, `notes`
)
SELECT
	st.`season_id`, st.`team_id`, st.`group_id`, t.`name`, t.`logo_url`, t.`category_id`,
	t.`captain_name`, t.`captain_phone`, t.`co_captain_name`, t.`co_captain_phone`,
	t.`unavailable_dates`, t.`coming_from`, t.`is_far_away`, t.`notes`
FROM `season_team` st
INNER JOIN `team` t ON t.`id` = st.`team_id`;
--> statement-breakpoint
CREATE TABLE `__new_player` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`jersey_number` text NOT NULL,
	`position_id` text,
	`team_id` text NOT NULL,
	`season_id` text NOT NULL,
	FOREIGN KEY (`position_id`) REFERENCES `position`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`season_id`, `team_id`) REFERENCES `season_team`(`season_id`, `team_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_player` (`id`, `name`, `jersey_number`, `position_id`, `team_id`, `season_id`)
SELECT
	CASE
		WHEN ROW_NUMBER() OVER (PARTITION BY p.`id` ORDER BY st.`season_id`) = 1 THEN p.`id`
		ELSE lower(hex(randomblob(16)))
	END,
	p.`name`, p.`jersey_number`, p.`position_id`, p.`team_id`, st.`season_id`
FROM `player` p
INNER JOIN `season_team` st ON st.`team_id` = p.`team_id`;
--> statement-breakpoint
DROP TABLE `player`;
--> statement-breakpoint
DROP TABLE `season_team`;
--> statement-breakpoint
DROP TABLE `team`;
--> statement-breakpoint
ALTER TABLE `__new_team` RENAME TO `team`;
--> statement-breakpoint
ALTER TABLE `__new_season_team` RENAME TO `season_team`;
--> statement-breakpoint
ALTER TABLE `__new_player` RENAME TO `player`;
--> statement-breakpoint
COMMIT;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
