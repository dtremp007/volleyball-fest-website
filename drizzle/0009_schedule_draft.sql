CREATE TABLE `schedule_draft` (
	`id` text PRIMARY KEY NOT NULL,
	`season_id` text NOT NULL,
	`name` text NOT NULL,
	`preset_name` text,
	`weights_json` text NOT NULL,
	`seed` integer NOT NULL,
	`placements_json` text NOT NULL,
	`metrics_json` text NOT NULL,
	`unscheduled_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `season`(`id`) ON UPDATE no action ON DELETE cascade
);
