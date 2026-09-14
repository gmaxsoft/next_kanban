-- AlterTable
ALTER TABLE `Board` ADD COLUMN `teamId` CHAR(36) NULL;

-- Assign existing boards to IT
UPDATE `Board` SET `teamId` = '00000000-0000-4000-8000-000000000010' WHERE `teamId` IS NULL;

ALTER TABLE `Board` MODIFY `teamId` CHAR(36) NOT NULL;

CREATE INDEX `Board_teamId_idx` ON `Board`(`teamId`);

ALTER TABLE `Board` ADD CONSTRAINT `Board_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ensure Biuro team exists (skip if already created)
INSERT INTO `Team` (`id`, `name`, `description`, `createdAt`)
SELECT 'bd4e01cd-9c6f-4682-b4c0-fb412b0ee07d', 'Biuro', 'Zespół Biuro', CURRENT_TIMESTAMP(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Team` WHERE `name` = 'Biuro');
