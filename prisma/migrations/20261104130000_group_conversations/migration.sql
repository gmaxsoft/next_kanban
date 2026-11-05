-- CreateTable
CREATE TABLE `GroupConversation` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NULL,
    `memberKey` VARCHAR(512) NOT NULL,
    `createdById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GroupConversation_memberKey_key`(`memberKey`),
    INDEX `GroupConversation_createdById_idx`(`createdById`),
    INDEX `GroupConversation_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GroupConversationMember` (
    `id` CHAR(36) NOT NULL,
    `conversationId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GroupConversationMember_userId_idx`(`userId`),
    INDEX `GroupConversationMember_conversationId_idx`(`conversationId`),
    UNIQUE INDEX `GroupConversationMember_conversationId_userId_key`(`conversationId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GroupMessage` (
    `id` CHAR(36) NOT NULL,
    `content` TEXT NOT NULL,
    `authorId` CHAR(36) NOT NULL,
    `conversationId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GroupMessage_createdAt_idx`(`createdAt`),
    INDEX `GroupMessage_authorId_idx`(`authorId`),
    INDEX `GroupMessage_conversationId_idx`(`conversationId`),
    INDEX `GroupMessage_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GroupConversationRead` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `conversationId` CHAR(36) NOT NULL,
    `lastReadAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GroupConversationRead_userId_idx`(`userId`),
    INDEX `GroupConversationRead_conversationId_idx`(`conversationId`),
    UNIQUE INDEX `GroupConversationRead_userId_conversationId_key`(`userId`, `conversationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GroupAttachment` (
    `id` CHAR(36) NOT NULL,
    `messageId` CHAR(36) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GroupAttachment_messageId_idx`(`messageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GroupConversation` ADD CONSTRAINT `GroupConversation_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupConversationMember` ADD CONSTRAINT `GroupConversationMember_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `GroupConversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupConversationMember` ADD CONSTRAINT `GroupConversationMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupMessage` ADD CONSTRAINT `GroupMessage_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupMessage` ADD CONSTRAINT `GroupMessage_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `GroupConversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupConversationRead` ADD CONSTRAINT `GroupConversationRead_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupConversationRead` ADD CONSTRAINT `GroupConversationRead_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `GroupConversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupAttachment` ADD CONSTRAINT `GroupAttachment_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `GroupMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
