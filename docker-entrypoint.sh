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
# Limpieza de uploads huérfanos: supercronic + crontab (proceso aparte del servidor HTTP).
if [ "${ENABLE_UPLOAD_CLEANUP_CRON:-1}" != "0" ] && [ -f /app/crontab ]; then
  echo "[docker-entrypoint] iniciando supercronic con /app/crontab"
  /usr/local/bin/supercronic /app/crontab &
fi
exec "$@"
