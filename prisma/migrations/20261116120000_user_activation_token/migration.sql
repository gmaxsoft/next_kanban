-- AlterTable
ALTER TABLE `User` ADD COLUMN `activationTokenHash` CHAR(64) NULL,
    ADD COLUMN `activationTokenExpiresAt` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_activationTokenHash_key` ON `User`(`activationTokenHash`);
