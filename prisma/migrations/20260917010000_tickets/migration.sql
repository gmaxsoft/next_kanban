-- CreateTable
CREATE TABLE `Ticket` (
    `id` CHAR(36) NOT NULL,
    `number` INTEGER NOT NULL AUTO_INCREMENT,
    `subject` VARCHAR(255) NOT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `requesterEmail` VARCHAR(255) NOT NULL,
    `requesterName` VARCHAR(160) NULL,
    `teamId` CHAR(36) NULL,
    `taskId` CHAR(36) NULL,
    `lastMessageAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Ticket_number_key`(`number`),
    UNIQUE INDEX `Ticket_taskId_key`(`taskId`),
    INDEX `Ticket_status_lastMessageAt_idx`(`status`, `lastMessageAt`),
    INDEX `Ticket_teamId_idx`(`teamId`),
    INDEX `Ticket_requesterEmail_idx`(`requesterEmail`),
    INDEX `Ticket_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci AUTO_INCREMENT = 100;

-- CreateTable
CREATE TABLE `TicketMessage` (
    `id` CHAR(36) NOT NULL,
    `ticketId` CHAR(36) NOT NULL,
    `kind` ENUM('INBOUND', 'OUTBOUND', 'INTERNAL') NOT NULL,
    `fromEmail` VARCHAR(255) NULL,
    `fromName` VARCHAR(160) NULL,
    `subject` VARCHAR(255) NULL,
    `bodyText` LONGTEXT NULL,
    `bodyHtml` LONGTEXT NULL,
    `externalMessageId` VARCHAR(255) NULL,
    `authorId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TicketMessage_externalMessageId_key`(`externalMessageId`),
    INDEX `TicketMessage_ticketId_createdAt_idx`(`ticketId`, `createdAt`),
    INDEX `TicketMessage_authorId_idx`(`authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Team` ADD COLUMN `inboundEmail` VARCHAR(255) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Team_inboundEmail_key` ON `Team`(`inboundEmail`);

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketMessage` ADD CONSTRAINT `TicketMessage_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketMessage` ADD CONSTRAINT `TicketMessage_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
