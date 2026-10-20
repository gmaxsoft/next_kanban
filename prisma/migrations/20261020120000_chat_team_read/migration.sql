-- CreateTable
CREATE TABLE `ChatTeamRead` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `teamId` CHAR(36) NOT NULL,
    `lastReadAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ChatTeamRead_userId_idx`(`userId`),
    INDEX `ChatTeamRead_teamId_idx`(`teamId`),
    UNIQUE INDEX `ChatTeamRead_userId_teamId_key`(`userId`, `teamId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ChatTeamRead` ADD CONSTRAINT `ChatTeamRead_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatTeamRead` ADD CONSTRAINT `ChatTeamRead_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
