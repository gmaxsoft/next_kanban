-- AlterTable
ALTER TABLE `Ticket` ADD COLUMN `priority` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM';

-- CreateIndex
CREATE INDEX `Ticket_priority_idx` ON `Ticket`(`priority`);
