-- CreateTable Role
CREATE TABLE `Role` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Role_name_key`(`name`),
    UNIQUE INDEX `Role_slug_key`(`slug`),
    INDEX `Role_isAdmin_idx`(`isAdmin`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable Team
CREATE TABLE `Team` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Team_name_key`(`name`),
    INDEX `Team_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed system roles + IT team (fixed UUIDs)
INSERT INTO `Role` (`id`, `name`, `slug`, `isSystem`, `isAdmin`, `createdAt`) VALUES
('00000000-0000-4000-8000-000000000001', 'ADMINISTRATOR', 'ADMIN', true, true, CURRENT_TIMESTAMP(3)),
('00000000-0000-4000-8000-000000000002', 'Pracownik', 'USER', true, false, CURRENT_TIMESTAMP(3));

INSERT INTO `Team` (`id`, `name`, `description`, `createdAt`) VALUES
('00000000-0000-4000-8000-000000000010', 'IT', 'Zespół IT', CURRENT_TIMESTAMP(3));

-- AlterTable User: add FKs
ALTER TABLE `User` ADD COLUMN `roleId` CHAR(36) NULL;
ALTER TABLE `User` ADD COLUMN `teamId` CHAR(36) NULL;

UPDATE `User` SET `roleId` = '00000000-0000-4000-8000-000000000001' WHERE `role` = 'ADMIN';
UPDATE `User` SET `roleId` = '00000000-0000-4000-8000-000000000002' WHERE `role` = 'USER';
UPDATE `User` SET `teamId` = '00000000-0000-4000-8000-000000000010';

ALTER TABLE `User` MODIFY `roleId` CHAR(36) NOT NULL;

DROP INDEX `User_role_idx` ON `User`;
ALTER TABLE `User` DROP COLUMN `role`;

CREATE INDEX `User_roleId_idx` ON `User`(`roleId`);
CREATE INDEX `User_teamId_idx` ON `User`(`teamId`);

ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `User` ADD CONSTRAINT `User_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Chat messages scoped to team
ALTER TABLE `ChatMessage` ADD COLUMN `teamId` CHAR(36) NULL;
UPDATE `ChatMessage` SET `teamId` = '00000000-0000-4000-8000-000000000010';
ALTER TABLE `ChatMessage` MODIFY `teamId` CHAR(36) NOT NULL;

CREATE INDEX `ChatMessage_teamId_idx` ON `ChatMessage`(`teamId`);
CREATE INDEX `ChatMessage_teamId_createdAt_idx` ON `ChatMessage`(`teamId`, `createdAt`);

ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
