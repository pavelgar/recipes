CREATE TABLE `cooked_dates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`cooked_on` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cooked_dates_recipe_id` ON `cooked_dates` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`language` text NOT NULL,
	`measuring_system` text NOT NULL,
	`servings` text,
	`prep_minutes` integer,
	`cook_minutes` integer,
	`total_minutes` integer,
	`ingredients` text NOT NULL,
	`steps` text NOT NULL,
	`source_name` text,
	`source_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
