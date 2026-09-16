-- AlterTable
ALTER TABLE `Team`
    ADD COLUMN `inboundType` ENUM('WEBHOOK', 'IMAP') NOT NULL DEFAULT 'WEBHOOK',
    ADD COLUMN `imapHost` VARCHAR(255) NULL,
    ADD COLUMN `imapPort` INTEGER NULL DEFAULT 993,
    ADD COLUMN `imapUser` VARCHAR(255) NULL,
    ADD COLUMN `imapPassword` VARCHAR(255) NULL,
    ADD COLUMN `imapSecure` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `imapMailbox` VARCHAR(120) NULL;

-- CreateIndex
CREATE INDEX `Team_inboundType_idx` ON `Team`(`inboundType`);
