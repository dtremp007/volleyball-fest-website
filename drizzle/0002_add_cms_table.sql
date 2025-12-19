-- Migration: Add CMS content table
CREATE TABLE IF NOT EXISTS `cms` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `value` text,
  `value_type` text NOT NULL DEFAULT 'string',
  `meta` text,
  `parent_id` text REFERENCES `cms`(`id`) ON DELETE CASCADE
);

-- Create index for faster parent-child queries
CREATE INDEX IF NOT EXISTS `cms_parent_id_idx` ON `cms`(`parent_id`);
CREATE INDEX IF NOT EXISTS `cms_name_idx` ON `cms`(`name`);
