# Inicio rápido – AvaRunners con PostgreSQL local

Todo está ya configurado para usar PostgreSQL en tu máquina. Solo hace falta instalar dependencias y ejecutar el setup una vez.

## 1. Ajustar `.env` (solo si tu Postgres no es postgres/postgres)

En la raíz del proyecto ya existe un archivo **`.env`** con:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/avarunners
```

- Si tu usuario de PostgreSQL es otro, cambia `postgres:postgres` por `usuario:contraseña`.
- Si usas otro puerto o host, ajusta `localhost:5432`.

## 2. Instalar dependencias

```bash
npm install
```

(Si tu empresa usa otro registry npm, asegúrate de poder instalar desde ahí; Prisma y @prisma/client deben quedar en `node_modules`.)

## 3. Dejar la base de datos lista (una sola vez)

Este comando crea la base `avarunners` si no existe, genera el cliente Prisma, crea las tablas e inserta los datos de prueba:

```bash
npm run db:setup
```

Si prefieres hacerlo por pasos:

```bash
npm run db:create    # crea la BD avarunners
npm run db:generate  # genera cliente Prisma
npm run db:push      # crea tablas
npm run db:seed      # inserta equipos, territorios y 2 usuarios de prueba
```

## 4. Arrancar la API

```bash
npm run dev
```

La API quedará en **http://localhost:3056**. Con el `.env` actual usará PostgreSQL (datos reales).

### Probar login

- **tijey@avarunners.com** / contraseña: **Prueba123**
- **juan@avarunners.com** / contraseña: **Prueba123**

Documentación de endpoints: **http://localhost:3056/api-docs**  
Colección Postman: **docs/AvaRunners-Postman-Collection.json**

---

**Requisito:** PostgreSQL instalado y en ejecución en tu PC (puerto 5432 por defecto).
