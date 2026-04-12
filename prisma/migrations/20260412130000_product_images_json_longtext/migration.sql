-- Varias imágenes en base64 superan el límite de TEXT (64 KB).
ALTER TABLE `Product` MODIFY COLUMN `imagesJson` LONGTEXT NOT NULL;
