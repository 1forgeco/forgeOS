CREATE TABLE `workspace_preferences` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`settings_json` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
