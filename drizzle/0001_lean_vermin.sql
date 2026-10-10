CREATE TABLE `ai_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'ollama' NOT NULL,
	`base_url` text DEFAULT 'https://ollama.com' NOT NULL,
	`model` text DEFAULT 'gpt-oss:120b' NOT NULL,
	`api_key` text DEFAULT '' NOT NULL,
	`fallback_model` text DEFAULT '' NOT NULL,
	`max_tokens` integer DEFAULT 1800 NOT NULL,
	`temperature` real DEFAULT 0.6 NOT NULL,
	`timeout_ms` integer DEFAULT 60000 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`system_prompt_override` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text
);
--> statement-breakpoint
CREATE TABLE `ai_usage_log` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`source` text NOT NULL,
	`ok` integer DEFAULT true NOT NULL,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	`detail` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
