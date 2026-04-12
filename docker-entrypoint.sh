#!/bin/sh
set -e
if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  echo "[docker-entrypoint] prisma migrate deploy"
  npx prisma migrate deploy
fi
if [ "${SKIP_SEED:-0}" != "1" ]; then
  echo "[docker-entrypoint] prisma db seed (admin u otros datos iniciales)"
  npx prisma db seed
fi
exec "$@"
