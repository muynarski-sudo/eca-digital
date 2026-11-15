#!/bin/sh
# Agenda os jobs com o cron do Alpine. Horário no fuso TZ.
set -eu
cat > /etc/crontabs/root <<'CRON'
0 9 * * * cd /app && npm run -s jobs:reminders >> /proc/1/fd/1 2>&1
0 3 * * * cd /app && npm run -s jobs:purge-recordings >> /proc/1/fd/1 2>&1
CRON
exec crond -f -l 8
