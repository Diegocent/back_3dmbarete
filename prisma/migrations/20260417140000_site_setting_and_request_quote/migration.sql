-- AlterTable
ALTER TABLE `Product` ADD COLUMN `requestQuoteOnly` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `SiteSetting` (
    `id` VARCHAR(191) NOT NULL,
    `heroImageUrl` VARCHAR(2000) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `SiteSetting` (`id`, `heroImageUrl`, `updatedAt`) VALUES ('default', NULL, CURRENT_TIMESTAMP(3));
