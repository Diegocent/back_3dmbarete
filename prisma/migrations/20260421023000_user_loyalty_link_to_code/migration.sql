-- AlterTable
ALTER TABLE `User`
    ADD COLUMN `loyaltyCodeId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `User_loyaltyCodeId_idx` ON `User`(`loyaltyCodeId`);

-- AddForeignKey
ALTER TABLE `User`
    ADD CONSTRAINT `User_loyaltyCodeId_fkey`
    FOREIGN KEY (`loyaltyCodeId`) REFERENCES `LoyaltyCode`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Backfill opcional para códigos históricos de un solo uso
UPDATE `User` u
JOIN `LoyaltyCode` c ON c.usedById = u.id
SET u.`loyaltyCodeId` = c.`id`
WHERE u.`loyaltyCodeId` IS NULL;
