-- =============================================================================
-- Parche idempotente: SiteSetting + Product.requestQuoteOnly
-- Equivalente lógico a: prisma/migrations/20260417140000_site_setting_and_request_quote
-- Seguro para datos existentes: no borra tablas ni filas de negocio.
-- =============================================================================

-- 1) Columna requestQuoteOnly en Product (solo si falta)
SET @db := DATABASE();
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Product' AND COLUMN_NAME = 'requestQuoteOnly'
);
SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE `Product` ADD COLUMN `requestQuoteOnly` BOOLEAN NOT NULL DEFAULT false',
  'SELECT ''skip: Product.requestQuoteOnly ya existe'' AS patch_note'
);
PREPARE _stmt FROM @ddl;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

-- 2) Tabla SiteSetting (solo si no existe)
CREATE TABLE IF NOT EXISTS `SiteSetting` (
  `id` VARCHAR(191) NOT NULL,
  `heroImageUrl` VARCHAR(2000) NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3) Fila por defecto (solo si no está)
INSERT INTO `SiteSetting` (`id`, `heroImageUrl`, `updatedAt`)
SELECT 'default', NULL, CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (SELECT 1 FROM `SiteSetting` WHERE `id` = 'default' LIMIT 1);
