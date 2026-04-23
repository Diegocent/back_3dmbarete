-- =============================================================================
-- Parche idempotente: vincular usuarios a códigos de fidelidad
-- Equivalente lógico a:
-- prisma/migrations/20260421023000_user_loyalty_link_to_code
--
-- Ejecutar DESPUÉS de 20260421010000_loyalty_codes_reusable_and_manageable.sql
-- Base de datos activa correcta, o descomentá USE `YOUR_DB`;
-- =============================================================================

-- USE `YOUR_DB`;

SELECT DATABASE() AS active_database;

SET @db := DATABASE();

SET @user_table := (
  SELECT TABLE_NAME
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = @db
    AND LOWER(TABLE_NAME) = 'user'
  LIMIT 1
);

SET @loyalty_table := (
  SELECT TABLE_NAME
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = @db
    AND LOWER(TABLE_NAME) = 'loyaltycode'
  LIMIT 1
);

-- 1) Columna User.loyaltyCodeId (solo si falta)
SET @has_col := IF(
  @db IS NULL OR @user_table IS NULL,
  -1,
  (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = @user_table
      AND COLUMN_NAME = 'loyaltyCodeId'
  )
);

SET @sql_col := IF(
  @db IS NULL,
  'SELECT ''ERROR: no hay base de datos activa (DATABASE() es NULL). Elegí la BD y re-ejecutá.'' AS patch_note',
  IF(
    @user_table IS NULL,
    'SELECT ''ERROR: no existe tabla User en esta base.'' AS patch_note',
    IF(
      @has_col < 0,
      'SELECT ''ERROR: no se pudo inspeccionar User (revisá la base activa).'' AS patch_note',
      IF(
        @has_col = 0,
        CONCAT('ALTER TABLE `', @user_table, '` ADD COLUMN `loyaltyCodeId` VARCHAR(191) NULL'),
        'SELECT ''skip: User.loyaltyCodeId ya existe'' AS patch_note'
      )
    )
  )
);

PREPARE _stmt1 FROM @sql_col;
EXECUTE _stmt1;
DEALLOCATE PREPARE _stmt1;

-- 2) Índice User_loyaltyCodeId_idx (solo si falta)
SET @has_idx := IF(
  @db IS NULL OR @user_table IS NULL,
  -1,
  (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = @user_table
      AND INDEX_NAME = 'User_loyaltyCodeId_idx'
  )
);

SET @sql_idx := IF(
  @db IS NULL,
  'SELECT ''ERROR: no hay base de datos activa (DATABASE() es NULL). Elegí la BD y re-ejecutá.'' AS patch_note',
  IF(
    @user_table IS NULL,
    'SELECT ''ERROR: no existe tabla User en esta base.'' AS patch_note',
    IF(
      @has_idx < 0,
      'SELECT ''ERROR: no se pudo inspeccionar índices de User (revisá la base activa).'' AS patch_note',
      IF(
        @has_idx = 0,
        CONCAT('CREATE INDEX `User_loyaltyCodeId_idx` ON `', @user_table, '`(`loyaltyCodeId`)'),
        'SELECT ''skip: User_loyaltyCodeId_idx ya existe'' AS patch_note'
      )
    )
  )
);

PREPARE _stmt2 FROM @sql_idx;
EXECUTE _stmt2;
DEALLOCATE PREPARE _stmt2;

-- 3) FK User_loyaltyCodeId_fkey (solo si falta)
SET @has_fk := IF(
  @db IS NULL,
  -1,
  (
    SELECT COUNT(*)
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @db
      AND CONSTRAINT_NAME = 'User_loyaltyCodeId_fkey'
  )
);

SET @sql_fk := IF(
  @db IS NULL,
  'SELECT ''ERROR: no hay base de datos activa (DATABASE() es NULL). Elegí la BD y re-ejecutá.'' AS patch_note',
  IF(
    @user_table IS NULL OR @loyalty_table IS NULL,
    'SELECT ''ERROR: faltan tablas User o LoyaltyCode en esta base.'' AS patch_note',
    IF(
      @has_fk = 0,
      CONCAT(
        'ALTER TABLE `',
        @user_table,
        '` ADD CONSTRAINT `User_loyaltyCodeId_fkey` FOREIGN KEY (`loyaltyCodeId`) REFERENCES `',
        @loyalty_table,
        '`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'
      ),
      'SELECT ''skip: User_loyaltyCodeId_fkey ya existe'' AS patch_note'
    )
  )
);

PREPARE _stmt3 FROM @sql_fk;
EXECUTE _stmt3;
DEALLOCATE PREPARE _stmt3;

-- 4) Backfill opcional desde códigos históricos (si aplica)
UPDATE `User` u
JOIN `LoyaltyCode` c ON c.usedById = u.id
SET u.`loyaltyCodeId` = c.`id`
WHERE u.`loyaltyCodeId` IS NULL;
