CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`partner_id` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`digest` text PRIMARY KEY NOT NULL,
	`device_code` text NOT NULL,
	`expires` integer NOT NULL,
	`interval` integer NOT NULL,
	`next_poll` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `partners` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`profile_digest` text,
	`profile_expires` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `partners_email_unique` ON `partners` (`email`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`digest` text PRIMARY KEY NOT NULL,
	`github_id` text NOT NULL,
	`login` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `signup_starts` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`created_at` text NOT NULL
);
