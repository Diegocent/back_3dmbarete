#!/bin/sh
set -e
if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  echo "[docker-entrypoint] prisma migrate deploy"
  npx prisma migrate deploy
fi
exec "$@"
