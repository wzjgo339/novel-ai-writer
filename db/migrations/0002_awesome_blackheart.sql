CREATE TABLE `character_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`novel_id` text NOT NULL,
	`character_id_1` text NOT NULL,
	`character_id_2` text NOT NULL,
	`relationship_type` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`novel_id`) REFERENCES `novels`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id_1`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id_2`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`novel_id` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`aliases` text DEFAULT '' NOT NULL,
	`age` text DEFAULT '' NOT NULL,
	`gender` text DEFAULT '' NOT NULL,
	`appearance` text DEFAULT '' NOT NULL,
	`personality` text DEFAULT '' NOT NULL,
	`background` text DEFAULT '' NOT NULL,
	`motivation` text DEFAULT '' NOT NULL,
	`arc` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`novel_id`) REFERENCES `novels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `plot_events` (
	`id` text PRIMARY KEY NOT NULL,
	`novel_id` text NOT NULL,
	`chapter_id` text,
	`title` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`novel_id`) REFERENCES `novels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `world_terms` (
	`id` text PRIMARY KEY NOT NULL,
	`novel_id` text NOT NULL,
	`term` text DEFAULT '' NOT NULL,
	`type` text DEFAULT '其他' NOT NULL,
	`definition` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`novel_id`) REFERENCES `novels`(`id`) ON UPDATE no action ON DELETE cascade
);
