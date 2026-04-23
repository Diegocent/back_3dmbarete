# Probar en local con MySQL (API `back/` + tienda `front/`)

Objetivo: **misma base MySQL en tu PC** que consuma el API Express, sin pegarle a producción.

## 1) Levantar MySQL local (recomendado: Docker)

Desde la carpeta `back/`:

```powershell
docker compose up mysql -d
```

Eso deja MySQL **8.4** escuchando en el **host** en el puerto **3307** (usuario `mbarete`, clave `mbarete_dev`, base `mbarete`). Los datos persisten en el volumen Docker `mysql_data`.

Si preferís levantar API + MySQL juntos: `docker compose up --build` (necesitás variables en `back/.env`; ver comentarios en `docker-compose.yml`).

### Ya tenés MySQL en otro Docker Compose (p. ej. `3306:3306`)

En Docker Desktop el mapeo **izquierda:derecha** es **host:contenedor**. Si ves `3306:3306`, desde Windows la base te queda en **`127.0.0.1:3306`** (no en 3307). El `DATABASE_URL` del `back/` tiene que usar **ese puerto** y el **usuario, contraseña y nombre de base** definidos en *ese* `docker-compose` (no los del repo si son distintos).

El puerto **3307** del ejemplo siguiente es solo el del `back/docker-compose.yml` de este proyecto, elegido para no chocar con un MySQL que ya use el **3306** en tu máquina.

## 2) Apuntar Prisma / API a esa base (fuera de Docker)

En `back/.env` (no commitear secretos reales), usá una URL que hable con el **puerto publicado en el host** (en el compose de este repo suele ser **3307**):

```env
DATABASE_URL=mysql://mbarete:mbarete_dev@127.0.0.1:3307/mbarete
```

Si tu contenedor publica **3306**, por ejemplo:

```env
DATABASE_URL=mysql://TU_USUARIO:TU_CLAVE@127.0.0.1:3306/TU_BASE
```

Ajustá usuario/clave/puerto según el stack que estés usando.

## 3) Aplicar esquema y datos mínimos

En **`npm run dev`** el API ejecuta antes **`prisma migrate deploy`** (script `predev`), así que con `DATABASE_URL` válida las migraciones pendientes se aplican solas al levantar en local.

Si preferís hacerlo a mano una vez:

```powershell
npx prisma generate
npx prisma migrate deploy
```

Opcional, usuario admin de prueba:

```powershell
npm run db:seed
```

Verificá con `npm run db:studio` si querés inspeccionar tablas.

## 4) Arrancar el API en local

```powershell
npm run dev
```

Por defecto suele ser el puerto **3056** (ver `PORT` en `.env`). Definí también `AUTH_SECRET` (cualquier string largo en desarrollo) si tu entorno fuerza `NODE_ENV=production`.

`PUBLIC_FILES_BASE_URL`: en local puede ser `http://127.0.0.1:3056` para que las URLs de uploads resuelvan bien desde el navegador.

`CORS_ORIGIN`: incluí el origen del front, por ejemplo `http://localhost:5173`.

## 5) Apuntar el front al API local

En `front/.env` o `front/.env.local`:

```env
VITE_API_URL=http://127.0.0.1:3056
```

Luego en `front/`:

```powershell
npm run dev
```

Vite suele usar el puerto **5173**; el proxy de `/api` y `/uploads` seguirá esa `VITE_API_URL`.

## 6) Parches SQL manuales (producción / DBA)

Si en el servidor aplicás DDL a mano, usá los scripts idempotentes en `back/scripts/sql/patches/` y leé `back/scripts/sql/README.md` (incluye nota sobre `prisma migrate resolve`).

## Alternativa sin Docker

Instalá MySQL en Windows, creá la base `mbarete` y un usuario con permisos, y poné esa `DATABASE_URL` en `back/.env`. El resto de pasos (migrate, seed, `npm run dev`) es igual.
