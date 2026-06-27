CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT '未命名文档' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
