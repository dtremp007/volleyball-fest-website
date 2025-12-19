-- Add state column to season table
ALTER TABLE `season` ADD COLUMN `state` text DEFAULT 'draft' NOT NULL;
