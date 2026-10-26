-- CreateTable
CREATE TABLE `DirectConversation` (
    `id` CHAR(36) NOT NULL,
    `userLowId` CHAR(36) NOT NULL,
    `userHighId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DirectConversation_userLowId_userHighId_key`(`userLowId`, `userHighId`),
    INDEX `DirectConversation_userLowId_idx`(`userLowId`),
    INDEX `DirectConversation_userHighId_idx`(`userHighId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DirectMessage` (
    `id` CHAR(36) NOT NULL,
    `content` TEXT NOT NULL,
    `authorId` CHAR(36) NOT NULL,
    `conversationId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DirectMessage_createdAt_idx`(`createdAt`),
    INDEX `DirectMessage_authorId_idx`(`authorId`),
    INDEX `DirectMessage_conversationId_idx`(`conversationId`),
    INDEX `DirectMessage_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DirectConversationRead` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `conversationId` CHAR(36) NOT NULL,
    `lastReadAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DirectConversationRead_userId_idx`(`userId`),
    INDEX `DirectConversationRead_conversationId_idx`(`conversationId`),
    UNIQUE INDEX `DirectConversationRead_userId_conversationId_key`(`userId`, `conversationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DirectAttachment` (
    `id` CHAR(36) NOT NULL,
    `messageId` CHAR(36) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DirectAttachment_messageId_idx`(`messageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DirectConversation` ADD CONSTRAINT `DirectConversation_userLowId_fkey` FOREIGN KEY (`userLowId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DirectConversation` ADD CONSTRAINT `DirectConversation_userHighId_fkey` FOREIGN KEY (`userHighId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DirectMessage` ADD CONSTRAINT `DirectMessage_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DirectMessage` ADD CONSTRAINT `DirectMessage_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `DirectConversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DirectConversationRead` ADD CONSTRAINT `DirectConversationRead_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DirectConversationRead` ADD CONSTRAINT `DirectConversationRead_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `DirectConversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DirectAttachment` ADD CONSTRAINT `DirectAttachment_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `DirectMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
