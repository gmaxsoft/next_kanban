-- AlterTable
ALTER TABLE `Role` ADD COLUMN `isRestricted` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `Role_isRestricted_idx` ON `Role`(`isRestricted`);

-- CreateTable
CREATE TABLE `TicketMessageMention` (
    `messageId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,

    INDEX `TicketMessageMention_userId_idx`(`userId`),
    PRIMARY KEY (`messageId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TicketMessageMention` ADD CONSTRAINT `TicketMessageMention_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `TicketMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketMessageMention` ADD CONSTRAINT `TicketMessageMention_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed system role: Ograniczone
INSERT INTO `Role` (`id`, `name`, `slug`, `isSystem`, `isAdmin`, `isRestricted`, `createdAt`)
VALUES (
  '00000000-0000-4000-8000-000000000003',
  'Ograniczone',
  'RESTRICTED',
  true,
  false,
  true,
  CURRENT_TIMESTAMP(3)
);
