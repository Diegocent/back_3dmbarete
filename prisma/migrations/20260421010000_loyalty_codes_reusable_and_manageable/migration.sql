-- AlterTable
ALTER TABLE `LoyaltyCode`
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `validityDays` INTEGER NOT NULL DEFAULT 90;
