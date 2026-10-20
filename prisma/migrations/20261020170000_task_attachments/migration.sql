-- CreateTable
CREATE TABLE `TaskAttachment` (
    `id` CHAR(36) NOT NULL,
    `taskId` CHAR(36) NOT NULL,
    `uploadedById` CHAR(36) NOT NULL,
    `storedName` CHAR(36) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(255) NOT NULL,
    `size` INTEGER NOT NULL,
    `contentHash` CHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TaskAttachment_storedName_key`(`storedName`),
    INDEX `TaskAttachment_taskId_idx`(`taskId`),
    INDEX `TaskAttachment_uploadedById_idx`(`uploadedById`),
    UNIQUE INDEX `TaskAttachment_taskId_contentHash_key`(`taskId`, `contentHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TaskAttachment` ADD CONSTRAINT `TaskAttachment_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAttachment` ADD CONSTRAINT `TaskAttachment_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
