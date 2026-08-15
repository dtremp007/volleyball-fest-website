ALTER TABLE `category` ADD `color` text DEFAULT '#374151' NOT NULL;
--> statement-breakpoint
UPDATE `category` SET `color` = '#000000' WHERE `id` = 'cat-varonil-libre' OR `name` = 'Varonil Libre';
--> statement-breakpoint
UPDATE `category` SET `color` = '#dc2626' WHERE `id` = 'cat-segunda-fuerza' OR `name` = 'Segunda Fuerza';
--> statement-breakpoint
UPDATE `category` SET `color` = '#9333ea' WHERE `id` = 'cat-femenil' OR `name` = 'Femenil';