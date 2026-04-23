-- =============================================================================
-- Parche idempotente: códigos de fidelidad reutilizables y administrables
-- Equivalente lógico a:
-- prisma/migrations/20260421010000_loyalty_codes_reusable_and_manageable
--
-- En DBeaver: base de datos activa correcta, o descomentá USE `YOUR_DB`;
-- =============================================================================

-- USE `YOUR_DB`;

SELECT DATABASE() AS active_database;

SET @db := DATABASE();

SET @loyalty_table := (
  SELECT TABLE_NAME
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = @db
    AND LOWER(TABLE_NAME) = 'loyaltycode'
  LIMIT 1
);

-- 1) Columna isActive (solo si falta)
SET @has_is_active := IF(
  @db IS NULL OR @loyalty_table IS NULL,
  -1,
  (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = @loyalty_table
      AND COLUMN_NAME = 'isActive'
  )
);

SET @sql_is_active := IF(
  @db IS NULL,
  'SELECT ''ERROR: no hay base de datos activa (DATABASE() es NULL). Elegí la BD y re-ejecutá.'' AS patch_note',
  IF(
    @loyalty_table IS NULL,
    'SELECT ''ERROR: no existe tabla LoyaltyCode en esta base.'' AS patch_note',
    IF(
      @has_is_active < 0,
      'SELECT ''ERROR: no se pudo inspeccionar LoyaltyCode (revisá la base activa).'' AS patch_note',
      IF(
        @has_is_active = 0,
        CONCAT('ALTER TABLE `', @loyalty_table, '` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true'),
        'SELECT ''skip: LoyaltyCode.isActive ya existe'' AS patch_note'
      )
    )
  )
);

PREPARE _stmt1 FROM @sql_is_active;
EXECUTE _stmt1;
DEALLOCATE PREPARE _stmt1;

-- 2) Columna validityDays (solo si falta)
SET @has_validity_days := IF(
  @db IS NULL OR @loyalty_table IS NULL,
  -1,
  (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = @loyalty_table
      AND COLUMN_NAME = 'validityDays'
  )
);

SET @sql_validity := IF(
  @db IS NULL,
  'SELECT ''ERROR: no hay base de datos activa (DATABASE() es NULL). Elegí la BD y re-ejecutá.'' AS patch_note',
  IF(
    @loyalty_table IS NULL,
    'SELECT ''ERROR: no existe tabla LoyaltyCode en esta base.'' AS patch_note',
    IF(
      @has_validity_days < 0,
      'SELECT ''ERROR: no se pudo inspeccionar LoyaltyCode (revisá la base activa).'' AS patch_note',
      IF(
        @has_validity_days = 0,
        CONCAT('ALTER TABLE `', @loyalty_table, '` ADD COLUMN `validityDays` INT NOT NULL DEFAULT 90'),
        'SELECT ''skip: LoyaltyCode.validityDays ya existe'' AS patch_note'
      )
    )
  )
);

PREPARE _stmt2 FROM @sql_validity;
EXECUTE _stmt2;
DEALLOCATE PREPARE _stmt2;
