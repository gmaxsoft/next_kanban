-- AlterTable
ALTER TABLE `Ticket` ADD COLUMN `listOrder` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Task` ADD COLUMN `listOrder` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `Ticket_listOrder_idx` ON `Ticket`(`listOrder`);

-- CreateIndex
CREATE INDEX `Task_listOrder_idx` ON `Task`(`listOrder`);
