ALTER TABLE `category` ADD `sort_order` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `category` SET `sort_order` = 0 WHERE `id` = 'cat-femenil' OR `name` = 'Femenil';
--> statement-breakpoint
UPDATE `category` SET `sort_order` = 1 WHERE `id` = 'cat-segunda-fuerza' OR `name` = 'Segunda Fuerza';
--> statement-breakpoint
UPDATE `category` SET `sort_order` = 2 WHERE `id` = 'cat-varonil-libre' OR `name` = 'Varonil Libre';
