-- =============================================================================
-- Parche idempotente: ampliar Product.technicalTip a TEXT
-- Equivalente lógico a:
-- prisma/migrations/20260421030000_product_technical_tip_text
--
-- En DBeaver/phpMyAdmin: elegí la base de datos en el desplegable ANTES de
-- ejecutar, o reemplazá YOUR_DB y descomentá la línea USE.
-- =============================================================================

-- USE `YOUR_DB`;

SELECT DATABASE() AS active_database;

SET @db := DATABASE();

-- Sin base activa, information_schema no encuentra columnas y el parche no altera nada.
SET @sql_alter := IF(
  @db IS NULL,
  'SELECT ''ERROR: no hay base de datos activa (DATABASE() es NULL). Elegí la BD y re-ejecutá.'' AS patch_note',
  NULL
);

-- Nombre real de la tabla en este servidor (Product vs product, etc.)
SET @product_table := (
  SELECT TABLE_NAME
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = @db
    AND LOWER(TABLE_NAME) = 'product'
  LIMIT 1
);

SET @col_data_type := IF(
  @db IS NULL OR @product_table IS NULL,
  NULL,
  (
    SELECT DATA_TYPE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = @product_table
      AND COLUMN_NAME = 'technicalTip'
    LIMIT 1
  )
);

SET @sql_alter := IF(
  @db IS NULL,
  @sql_alter,
  IF(
    @product_table IS NULL,
    'SELECT ''ERROR: no existe tabla Product en esta base.'' AS patch_note',
    IF(
      LOWER(COALESCE(@col_data_type, '')) = 'text',
      'SELECT ''skip: Product.technicalTip ya es TEXT'' AS patch_note',
      CONCAT('ALTER TABLE `', @product_table, '` MODIFY `technicalTip` TEXT NULL')
    )
  )
);

PREPARE _stmt FROM @sql_alter;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;
