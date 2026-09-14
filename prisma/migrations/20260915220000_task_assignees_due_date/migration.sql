-- AlterTable
ALTER TABLE `Task` ADD COLUMN `dueDate` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `TaskAssignee` (
    `taskId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,

    INDEX `TaskAssignee_userId_idx`(`userId`),
    PRIMARY KEY (`taskId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate existing single assignees
INSERT INTO `TaskAssignee` (`taskId`, `userId`)
SELECT `id`, `assigneeId` FROM `Task` WHERE `assigneeId` IS NOT NULL;

-- DropForeignKey
ALTER TABLE `Task` DROP FOREIGN KEY `Task_assigneeId_fkey`;

-- DropIndex
DROP INDEX `Task_assigneeId_idx` ON `Task`;

-- AlterTable
ALTER TABLE `Task` DROP COLUMN `assigneeId`;

-- AddForeignKey
ALTER TABLE `TaskAssignee` ADD CONSTRAINT `TaskAssignee_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAssignee` ADD CONSTRAINT `TaskAssignee_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX `Task_dueDate_idx` ON `Task`(`dueDate`);
