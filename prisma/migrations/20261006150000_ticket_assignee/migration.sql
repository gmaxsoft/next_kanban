ALTER TABLE `Ticket`
    ADD COLUMN `assigneeId` CHAR(36) NULL,
    ADD INDEX `Ticket_assigneeId_idx`(`assigneeId`),
    ADD CONSTRAINT `Ticket_assigneeId_fkey`
      FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`)
      ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `TaskWatcher` (
    `taskId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`taskId`, `userId`),
    INDEX `TaskWatcher_userId_idx`(`userId`),
    CONSTRAINT `TaskWatcher_taskId_fkey`
      FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `TaskWatcher_userId_fkey`
      FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TicketWatcher` (
    `ticketId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`ticketId`, `userId`),
    INDEX `TicketWatcher_userId_idx`(`userId`),
    CONSTRAINT `TicketWatcher_ticketId_fkey`
      FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `TicketWatcher_userId_fkey`
      FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
