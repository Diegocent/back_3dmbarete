-- =============================================================================
-- Parche idempotente: vincular usuarios a códigos de fidelidad
-- Equivalente lógico a:
-- prisma/migrations/20260421023000_user_loyalty_link_to_code
-- =============================================================================

SET @db := DATABASE();

-- 1) Columna User.loyaltyCodeId (solo si falta)
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'User' AND COLUMN_NAME = 'loyaltyCodeId'
);
SET @sql_col := IF(
  @has_col = 0,
  'ALTER TABLE `User` ADD COLUMN `loyaltyCodeId` VARCHAR(191) NULL',
  'SELECT ''skip: User.loyaltyCodeId ya existe'' AS patch_note'
);
PREPARE _stmt1 FROM @sql_col;
EXECUTE _stmt1;
DEALLOCATE PREPARE _stmt1;

-- 2) Índice User_loyaltyCodeId_idx (solo si falta)
SET @has_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'User' AND INDEX_NAME = 'User_loyaltyCodeId_idx'
);
SET @sql_idx := IF(
  @has_idx = 0,
  'CREATE INDEX `User_loyaltyCodeId_idx` ON `User`(`loyaltyCodeId`)',
  'SELECT ''skip: User_loyaltyCodeId_idx ya existe'' AS patch_note'
);
PREPARE _stmt2 FROM @sql_idx;
EXECUTE _stmt2;
DEALLOCATE PREPARE _stmt2;

-- 3) FK User_loyaltyCodeId_fkey (solo si falta)
SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = @db AND CONSTRAINT_NAME = 'User_loyaltyCodeId_fkey'
);
SET @sql_fk := IF(
  @has_fk = 0,
  'ALTER TABLE `User` ADD CONSTRAINT `User_loyaltyCodeId_fkey` FOREIGN KEY (`loyaltyCodeId`) REFERENCES `LoyaltyCode`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''skip: User_loyaltyCodeId_fkey ya existe'' AS patch_note'
);
PREPARE _stmt3 FROM @sql_fk;
EXECUTE _stmt3;
DEALLOCATE PREPARE _stmt3;

-- 4) Backfill opcional desde códigos históricos (si aplica)
UPDATE `User` u
JOIN `LoyaltyCode` c ON c.usedById = u.id
SET u.`loyaltyCodeId` = c.`id`
WHERE u.`loyaltyCodeId` IS NULL;
