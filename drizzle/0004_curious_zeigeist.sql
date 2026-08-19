CREATE TABLE `excelPendingActions` (
	`id` varchar(96) NOT NULL,
	`userId` int NOT NULL,
	`botClientId` varchar(128) NOT NULL,
	`taskClientId` varchar(128) NOT NULL,
	`toolName` varchar(64) NOT NULL,
	`arguments` json NOT NULL,
	`summary` text NOT NULL,
	`state` enum('pending','executed','declined','expired') NOT NULL DEFAULT 'pending',
	`result` json,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `excelPendingActions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `microsoftConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`microsoftUserId` varchar(255) NOT NULL,
	`displayName` varchar(255),
	`email` varchar(320),
	`encryptedAccessToken` text NOT NULL,
	`encryptedRefreshToken` text NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`scopes` text NOT NULL,
	`status` enum('connected','reauthorize') NOT NULL DEFAULT 'connected',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `microsoftConnections_id` PRIMARY KEY(`id`),
	CONSTRAINT `microsoftConnections_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `microsoftOAuthStates` (
	`state` varchar(96) NOT NULL,
	`userId` int NOT NULL,
	`codeVerifier` varchar(160) NOT NULL,
	`returnTo` varchar(500) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `microsoftOAuthStates_state` PRIMARY KEY(`state`)
);
--> statement-breakpoint
CREATE INDEX `excelPendingActions_user_idx` ON `excelPendingActions` (`userId`);--> statement-breakpoint
CREATE INDEX `excelPendingActions_task_idx` ON `excelPendingActions` (`taskClientId`);--> statement-breakpoint
CREATE INDEX `microsoftOAuthStates_user_idx` ON `microsoftOAuthStates` (`userId`);