-- Store metadata for files received with inbound ticket messages.
CREATE TABLE `TicketAttachment` (
    `id` CHAR(36) NOT NULL,
    `messageId` CHAR(36) NOT NULL,
    `storedName` CHAR(36) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(255) NOT NULL,
    `size` INTEGER NOT NULL,
    `contentHash` CHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TicketAttachment_messageId_contentHash_key`(`messageId`, `contentHash`),
    INDEX `TicketAttachment_messageId_createdAt_idx`(`messageId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TicketAttachment` ADD CONSTRAINT `TicketAttachment_messageId_fkey`
FOREIGN KEY (`messageId`) REFERENCES `TicketMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
