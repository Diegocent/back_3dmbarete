-- =============================================================================
-- Parche idempotente: códigos de fidelidad reutilizables y administrables
-- Equivalente lógico a:
-- prisma/migrations/20260421010000_loyalty_codes_reusable_and_manageable
-- =============================================================================

SET @db := DATABASE();

-- 1) Columna isActive (solo si falta)
SET @has_is_active := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'LoyaltyCode' AND COLUMN_NAME = 'isActive'
);
SET @sql_is_active := IF(
  @has_is_active = 0,
  'ALTER TABLE `LoyaltyCode` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true',
  'SELECT ''skip: LoyaltyCode.isActive ya existe'' AS patch_note'
);
PREPARE _stmt1 FROM @sql_is_active;
EXECUTE _stmt1;
DEALLOCATE PREPARE _stmt1;

-- 2) Columna validityDays (solo si falta)
SET @has_validity_days := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'LoyaltyCode' AND COLUMN_NAME = 'validityDays'
);
SET @sql_validity := IF(
  @has_validity_days = 0,
  'ALTER TABLE `LoyaltyCode` ADD COLUMN `validityDays` INT NOT NULL DEFAULT 90',
  'SELECT ''skip: LoyaltyCode.validityDays ya existe'' AS patch_note'
);
PREPARE _stmt2 FROM @sql_validity;
EXECUTE _stmt2;
DEALLOCATE PREPARE _stmt2;
