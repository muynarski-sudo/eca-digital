#!/bin/sh
# Backup diário do banco (pg_dump comprimido) com retenção em dias. Roda no serviço "backup" do compose às 03:00.
set -eu
: "${DATABASE_URL:?defina DATABASE_URL no .env}"
KEEP="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="/backups/db-${STAMP}.sql.gz"
mkdir -p /backups
pg_dump --no-owner --no-privileges --schema=public --schema=auth "$DATABASE_URL" | gzip -9 > "${OUT}.tmp"
mv "${OUT}.tmp" "$OUT"
echo "$(date -Iseconds) backup ok: $OUT ($(du -h "$OUT" | cut -f1))"
find /backups -name 'db-*.sql.gz' -mtime +"$KEEP" -delete
