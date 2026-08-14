CREATE TABLE `workroomSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`snapshot` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workroomSnapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `workroomSnapshots_userId_unique` UNIQUE(`userId`)
);
