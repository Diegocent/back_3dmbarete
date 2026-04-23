-- =============================================================================
-- Un solo script: las 3 migraciones Prisma pendientes (orden correcto)
-- - 20260421010000_loyalty_codes_reusable_and_manageable
-- - 20260421023000_user_loyalty_link_to_code
-- - 20260421030000_product_technical_tip_text
--
-- Tablas con nombres directos: LoyaltyCode, User, Product
-- Idempotente: podés ejecutarlo más de una vez.
--
-- En DBeaver/phpMyAdmin: seleccioná la base de datos antes de ejecutar,
-- o descomentá USE y poné el nombre real.
-- =============================================================================

-- USE `u462208964_3Dmbarete_test`;

SELECT DATABASE() AS active_database;

SET @db := DATABASE();

-- ---------------------------------------------------------------------------
-- 1) LoyaltyCode: isActive
-- ---------------------------------------------------------------------------
SET @has := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'LoyaltyCode'
    AND COLUMN_NAME = 'isActive'
);
SET @sql := IF(
  @db IS NULL,
  'SELECT ''ERROR: elegí la base de datos (DATABASE() es NULL).'' AS msg',
  IF(
    @has = 0,
    'ALTER TABLE `LoyaltyCode` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true',
    'SELECT ''skip: LoyaltyCode.isActive'' AS msg'
  )
);
PREPARE _s FROM @sql;
EXECUTE _s;
DEALLOCATE PREPARE _s;

-- ---------------------------------------------------------------------------
-- 2) LoyaltyCode: validityDays
-- ---------------------------------------------------------------------------
SET @has := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'LoyaltyCode'
    AND COLUMN_NAME = 'validityDays'
);
SET @sql := IF(
  @db IS NULL,
  'SELECT ''ERROR: elegí la base de datos (DATABASE() es NULL).'' AS msg',
  IF(
    @has = 0,
    'ALTER TABLE `LoyaltyCode` ADD COLUMN `validityDays` INT NOT NULL DEFAULT 90',
    'SELECT ''skip: LoyaltyCode.validityDays'' AS msg'
  )
);
PREPARE _s FROM @sql;
EXECUTE _s;
DEALLOCATE PREPARE _s;

-- ---------------------------------------------------------------------------
-- 3) User: loyaltyCodeId
-- ---------------------------------------------------------------------------
SET @has := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'User'
    AND COLUMN_NAME = 'loyaltyCodeId'
);
SET @sql := IF(
  @db IS NULL,
  'SELECT ''ERROR: elegí la base de datos (DATABASE() es NULL).'' AS msg',
  IF(
    @has = 0,
    'ALTER TABLE `User` ADD COLUMN `loyaltyCodeId` VARCHAR(191) NULL',
    'SELECT ''skip: User.loyaltyCodeId'' AS msg'
  )
);
PREPARE _s FROM @sql;
EXECUTE _s;
DEALLOCATE PREPARE _s;

-- ---------------------------------------------------------------------------
-- 4) User: índice User_loyaltyCodeId_idx
-- ---------------------------------------------------------------------------
SET @has := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'User'
    AND INDEX_NAME = 'User_loyaltyCodeId_idx'
);
SET @sql := IF(
  @db IS NULL,
  'SELECT ''ERROR: elegí la base de datos (DATABASE() es NULL).'' AS msg',
  IF(
    @has = 0,
    'CREATE INDEX `User_loyaltyCodeId_idx` ON `User`(`loyaltyCodeId`)',
    'SELECT ''skip: User_loyaltyCodeId_idx'' AS msg'
  )
);
PREPARE _s FROM @sql;
EXECUTE _s;
DEALLOCATE PREPARE _s;

-- ---------------------------------------------------------------------------
-- 5) User: FK hacia LoyaltyCode
-- ---------------------------------------------------------------------------
SET @has := (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = @db
    AND CONSTRAINT_NAME = 'User_loyaltyCodeId_fkey'
);
SET @sql := IF(
  @db IS NULL,
  'SELECT ''ERROR: elegí la base de datos (DATABASE() es NULL).'' AS msg',
  IF(
    @has = 0,
    'ALTER TABLE `User` ADD CONSTRAINT `User_loyaltyCodeId_fkey` FOREIGN KEY (`loyaltyCodeId`) REFERENCES `LoyaltyCode`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT ''skip: User_loyaltyCodeId_fkey'' AS msg'
  )
);
PREPARE _s FROM @sql;
EXECUTE _s;
DEALLOCATE PREPARE _s;

-- ---------------------------------------------------------------------------
-- 6) Backfill: usuarios vinculados por usedById (histórico)
-- ---------------------------------------------------------------------------
UPDATE `User` u
JOIN `LoyaltyCode` c ON c.usedById = u.id
SET u.`loyaltyCodeId` = c.`id`
WHERE u.`loyaltyCodeId` IS NULL;

-- ---------------------------------------------------------------------------
-- 7) Product: technicalTip → TEXT
-- ---------------------------------------------------------------------------
SET @dtype := (
  SELECT DATA_TYPE
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'Product'
    AND COLUMN_NAME = 'technicalTip'
  LIMIT 1
);
SET @sql := IF(
  @db IS NULL,
  'SELECT ''ERROR: elegí la base de datos (DATABASE() es NULL).'' AS msg',
  IF(
    LOWER(COALESCE(@dtype, '')) = 'text',
    'SELECT ''skip: Product.technicalTip ya es TEXT'' AS msg',
    'ALTER TABLE `Product` MODIFY `technicalTip` TEXT NULL'
  )
);
PREPARE _s FROM @sql;
EXECUTE _s;
DEALLOCATE PREPARE _s;
