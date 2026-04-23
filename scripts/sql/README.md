# Parches SQL manuales (MySQL)

Estos archivos son para cuando **tenés que ejecutar DDL directamente en el servidor MySQL** (panel Hostinger, cliente `mysql`, DBA, etc.) y querés **no tocar datos existentes**: solo columnas/tablas nuevas y filas de configuración por defecto.

## Convención

- Un archivo por cambio lógico, nombre alineado a la migración de Prisma: `patches/YYYYMMDDHHMMSS_descripcion_corta.sql`.
- Los scripts deben ser **idempotentes** (podés correrlos dos veces sin error ni duplicar filas clave).
- **No** incluir `DROP`, `TRUNCATE`, ni `DELETE` masivo salvo que sea explícitamente un parche de limpieza acordado.

## Relación con Prisma

- En desarrollo lo habitual es: `cd back && npx prisma migrate dev` (o `migrate deploy` en CI).
- Si en **producción** aplicás el SQL manual **en lugar de** `prisma migrate deploy`, al desplegar el API con Prisma podría intentar aplicar la misma migración otra vez. Opciones:
  1. Preferible: en ese entorno corrés **`npx prisma migrate deploy`** y **no** duplicás el SQL manual (el deploy ya trae la migración).
  2. Si ya ejecutaste el `.sql` a mano y la tabla `_prisma_migrations` no tiene el registro, marcá la migración como aplicada desde la carpeta `back/`:
     ```bash
     npx prisma migrate resolve --applied 20260417140000_site_setting_and_request_quote
     ```
     (Ajustá el nombre al de la carpeta en `prisma/migrations/`.)

## Cómo ejecutar

Conectate a la base correcta y ejecutá el archivo (ejemplo desde la máquina donde tenés el cliente MySQL):

```bash
mysql -h HOST -P PUERTO -u USUARIO -p NOMBRE_BD < back/scripts/sql/patches/20260417140000_site_setting_request_quote.sql
```

En Windows PowerShell, si `mysql` está en el PATH:

```powershell
Get-Content back\scripts\sql\patches\20260417140000_site_setting_request_quote.sql -Raw | mysql -h 127.0.0.1 -P 3307 -u mbarete -p mbarete
```

Hacé **backup** antes en producción.
