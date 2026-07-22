CREATE TABLE `agent_run_events` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`state` text NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `extension_deployments` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`installation_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`version_id` text NOT NULL,
	`auto_run` integer DEFAULT false NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `extension_installations` (
	`id` text PRIMARY KEY NOT NULL,
	`installation_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`extension_version` text NOT NULL,
	`label` text DEFAULT 'Chrome extension' NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `extension_installations_installation_unique` ON `extension_installations` (`installation_id`);