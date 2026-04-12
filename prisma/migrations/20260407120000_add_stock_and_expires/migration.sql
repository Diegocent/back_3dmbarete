-- AlterTable: add stock to Product
ALTER TABLE `Product` ADD COLUMN `stock` INTEGER NOT NULL DEFAULT 0;

-- AlterTable: add expiresAt to Order
ALTER TABLE `Order` ADD COLUMN `expiresAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Order_expiresAt_idx` ON `Order`(`expiresAt`);
