#!/usr/bin/env bash
# Gera supabase/setup.sql: todas as migrations em ordem, para colar no SQL Editor do Supabase (uma vez).
set -euo pipefail
cd "$(dirname "$0")/.."
out=supabase/setup.sql
{
  echo "-- Falando Francês Prática: instalação do banco (gerado por scripts/build-setup-sql.sh; não edite à mão)."
  echo "-- Cole tudo no SQL Editor do Supabase e clique em Run. Rode UMA vez em um projeto novo."
  for f in supabase/migrations/*.sql; do
    echo; echo "-- ===== $(basename "$f") ====="; cat "$f"
  done
} > "$out"
echo "gerado $out ($(wc -l < "$out") linhas)"
