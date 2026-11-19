#!/usr/bin/env bash
# Nightly backup of the site database. Run from cron on the server:
#   45 1 * * * /www/wwwroot/balapasa/scripts/ops/backup-db.sh >> /var/log/balapasa-backup.log 2>&1
#
# Writes a compressed dump to $BACKUP_DIR, checks it is readable, deletes dumps older than
# $KEEP_DAYS, and sends an alert (WhatsApp / Discord, see scripts/daraz/notify.mjs) if anything fails.
set -uo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/balapasa}"
BACKUP_DIR="${BACKUP_DIR:-/root/backups/balapasa}"
KEEP_DAYS="${KEEP_DAYS:-14}"
PG_BIN="${PG_BIN:-/www/server/pgsql/bin}"
# A real dump of this database lists well over this many tables with data.
MIN_TABLES=20

fail() {
  echo "$(date -Is) BACKUP FAILED: $1"
  (cd "$APP_DIR" && node scripts/ops/notify-cli.mjs "Database backup FAILED on balapasa.com.np: $1") || true
  exit 1
}

url=$(grep -h '^DATABASE_URL=' "$APP_DIR/.env.local" | head -1 | cut -d= -f2- | tr -d '"\r' | sed 's/?.*//')
[ -n "$url" ] || fail "DATABASE_URL not found in $APP_DIR/.env.local"

mkdir -p "$BACKUP_DIR" && chmod 700 "$BACKUP_DIR" || fail "cannot create $BACKUP_DIR"
file="$BACKUP_DIR/balapasadb-$(date +%Y%m%d-%H%M).dump"

"$PG_BIN/pg_dump" -Fc -d "$url" -f "$file.partial" || { rm -f "$file.partial"; fail "pg_dump returned an error"; }
tables=$("$PG_BIN/pg_restore" -l "$file.partial" 2>/dev/null | grep -c 'TABLE DATA' || true)
if [ "${tables:-0}" -lt "$MIN_TABLES" ]; then rm -f "$file.partial"; fail "the dump only lists ${tables:-0} tables"; fi
mv "$file.partial" "$file"

find "$BACKUP_DIR" -name 'balapasadb-*.dump' -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) backup ok: $file ($(du -h "$file" | cut -f1), $tables tables), $(find "$BACKUP_DIR" -name 'balapasadb-*.dump' | wc -l) kept"
