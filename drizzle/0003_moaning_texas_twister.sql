CREATE TABLE `userNotificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`approvalEnabled` boolean NOT NULL DEFAULT true,
	`completionEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userNotificationPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `userNotificationPreferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `workroomBots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(255) NOT NULL,
	`status` varchar(64) NOT NULL,
	`color` varchar(32) NOT NULL,
	`icon` varchar(96) NOT NULL,
	`payload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workroomBots_id` PRIMARY KEY(`id`),
	CONSTRAINT `workroomBots_user_client_unique` UNIQUE(`userId`,`clientId`)
);
--> statement-breakpoint
CREATE TABLE `workroomFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`owner` varchar(255) NOT NULL,
	`scope` varchar(96) NOT NULL,
	`payload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workroomFiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `workroomFiles_user_client_unique` UNIQUE(`userId`,`clientId`)
);
--> statement-breakpoint
CREATE TABLE `workroomTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` varchar(128) NOT NULL,
	`botClientId` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` varchar(64) NOT NULL,
	`risk` varchar(32) NOT NULL,
	`payload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workroomTasks_id` PRIMARY KEY(`id`),
	CONSTRAINT `workroomTasks_user_client_unique` UNIQUE(`userId`,`clientId`)
);
--> statement-breakpoint
ALTER TABLE `pushDevices` ADD `userId` int;--> statement-breakpoint
CREATE INDEX `workroomBots_user_idx` ON `workroomBots` (`userId`);--> statement-breakpoint
CREATE INDEX `workroomFiles_user_idx` ON `workroomFiles` (`userId`);--> statement-breakpoint
CREATE INDEX `workroomTasks_user_idx` ON `workroomTasks` (`userId`);