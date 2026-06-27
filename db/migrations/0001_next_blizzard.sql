CREATE TABLE `chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`volume_id` text NOT NULL,
	`title` text DEFAULT '未命名章节' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`volume_id`) REFERENCES `volumes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `novels` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT '未命名作品' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `volumes` (
	`id` text PRIMARY KEY NOT NULL,
	`novel_id` text NOT NULL,
	`title` text DEFAULT '未命名卷' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`novel_id`) REFERENCES `novels`(`id`) ON UPDATE no action ON DELETE cascade
);
