-- Datos de contacto del comprador en pedidos web
ALTER TABLE `Order` ADD COLUMN `guestName` VARCHAR(120) NULL;
ALTER TABLE `Order` ADD COLUMN `guestPhone` VARCHAR(40) NULL;
ALTER TABLE `Order` ADD COLUMN `guestAddress` VARCHAR(500) NULL;
