-- CreateTable
CREATE TABLE `Archiwum` (
    `id` CHAR(36) NOT NULL,
    `taskId` CHAR(36) NOT NULL,
    `boardId` CHAR(36) NOT NULL,
    `columnId` CHAR(36) NOT NULL,
    `columnTitle` VARCHAR(160) NOT NULL,
    `archivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `archivedById` CHAR(36) NOT NULL,

    UNIQUE INDEX `Archiwum_taskId_key`(`taskId`),
    INDEX `Archiwum_boardId_archivedAt_idx`(`boardId`, `archivedAt`),
    INDEX `Archiwum_archivedById_idx`(`archivedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Archiwum` ADD CONSTRAINT `Archiwum_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Archiwum` ADD CONSTRAINT `Archiwum_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `Board`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Archiwum` ADD CONSTRAINT `Archiwum_archivedById_fkey` FOREIGN KEY (`archivedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
