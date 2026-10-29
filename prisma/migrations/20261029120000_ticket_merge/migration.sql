-- AlterTable
ALTER TABLE `Ticket` ADD COLUMN `mergedIntoId` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `Ticket_mergedIntoId_idx` ON `Ticket`(`mergedIntoId`);

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_mergedIntoId_fkey` FOREIGN KEY (`mergedIntoId`) REFERENCES `Ticket`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
