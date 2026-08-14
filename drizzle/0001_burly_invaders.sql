CREATE TABLE `pushDevices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`installationId` varchar(96) NOT NULL,
	`expoPushToken` varchar(255) NOT NULL,
	`approvalEnabled` boolean NOT NULL DEFAULT true,
	`completionEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pushDevices_id` PRIMARY KEY(`id`),
	CONSTRAINT `pushDevices_installationId_unique` UNIQUE(`installationId`)
);
