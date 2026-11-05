-- Convert existing comma-joined keys to SHA-256, then shrink column for unique index limits.
UPDATE `GroupConversation` SET `memberKey` = SHA2(`memberKey`, 256);
ALTER TABLE `GroupConversation` MODIFY `memberKey` CHAR(64) NOT NULL;
