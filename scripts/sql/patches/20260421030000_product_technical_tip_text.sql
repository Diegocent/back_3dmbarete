-- =============================================================================
-- Parche idempotente: ampliar Product.technicalTip a TEXT
-- Equivalente lógico a:
-- prisma/migrations/20260421030000_product_technical_tip_text
-- =============================================================================

SET @db := DATABASE();

SET @col_data_type := (
  SELECT DATA_TYPE
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'Product'
    AND COLUMN_NAME = 'technicalTip'
  LIMIT 1
);

SET @sql_alter := IF(
  LOWER(COALESCE(@col_data_type, '')) <> 'text',
  'ALTER TABLE `Product` MODIFY `technicalTip` TEXT NULL',
  'SELECT ''skip: Product.technicalTip ya es TEXT'' AS patch_note'
);

PREPARE _stmt FROM @sql_alter;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;
