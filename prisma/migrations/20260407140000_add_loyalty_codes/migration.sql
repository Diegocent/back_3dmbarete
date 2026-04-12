-- CreateTable
CREATE TABLE `LoyaltyCode` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `usedById` VARCHAR(191) NULL,
    `usedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LoyaltyCode_code_key`(`code`),
    INDEX `LoyaltyCode_code_idx`(`code`),
    INDEX `LoyaltyCode_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
