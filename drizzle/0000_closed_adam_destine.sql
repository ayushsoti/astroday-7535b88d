CREATE TABLE `ai_conclusions` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`message_id` text,
	`text` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `calibration_events` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`event_date` text NOT NULL,
	`date_precision` text DEFAULT 'month' NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`confirmed` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`title` text DEFAULT 'New conversation' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`birth_date` text NOT NULL,
	`birth_time` text NOT NULL,
	`birth_place` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`timezone` text NOT NULL,
	`birth_utc` text NOT NULL,
	`status` text DEFAULT 'READY' NOT NULL,
	`natal_json` text NOT NULL,
	`dasha_json` text NOT NULL,
	`limitations_json` text DEFAULT '[]' NOT NULL,
	`calculated_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `engine_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`as_of_date` text NOT NULL,
	`request_json` text NOT NULL,
	`response_json` text NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`question_category` text,
	`domains_json` text DEFAULT '[]' NOT NULL,
	`convergence_label` text,
	`supporting_finding_ids_json` text DEFAULT '[]' NOT NULL,
	`uncertainty_notes_json` text DEFAULT '[]' NOT NULL,
	`knowledge_status_summary_json` text DEFAULT '{}' NOT NULL,
	`engine_run_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`statement` text NOT NULL,
	`category` text NOT NULL,
	`window_start` text,
	`window_end` text,
	`convergence_label` text,
	`source` text DEFAULT 'app' NOT NULL,
	`outcome` text DEFAULT 'pending' NOT NULL,
	`outcome_notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stated_facts` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`message_id` text,
	`text` text NOT NULL,
	`category` text,
	`event_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `upgrade_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text,
	`role` text DEFAULT 'user' NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`preferred_language` text DEFAULT 'hinglish' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);