#!/bin/sh
set -eu

case "${SERVICE_ROLE:-}" in
  web|worker) ;;
  "")
    case " $* " in
      *" worker "*|*"src/worker/index"*) SERVICE_ROLE=worker ;;
      *) SERVICE_ROLE=web ;;
    esac
    export SERVICE_ROLE
    ;;
  *) echo "SERVICE_ROLE inválido: ${SERVICE_ROLE}" >&2; exit 1 ;;
esac

node scripts/preflight.mjs

mode="${DB_SCHEMA_MODE:-${RUN_DB_SCHEMA_SYNC:+push}}"
mode="${mode:-push}"
baseline="20260723000000_existing_schema_baseline"

case "$mode" in
  none)
    echo "Sincronização de banco desativada."
    ;;
  push)
    echo "Aplicando schema Prisma por db push (modo de compatibilidade)..."
    ./node_modules/.bin/prisma db push --skip-generate
    ;;
  bootstrap)
    echo "Inicializando schema atual e adotando baseline controlada..."
    ./node_modules/.bin/prisma db push --skip-generate
    ./node_modules/.bin/prisma migrate resolve --applied "$baseline" >/dev/null 2>&1 || true
    ./node_modules/.bin/prisma migrate deploy
    ;;
  migrate)
    echo "Aplicando migrations Prisma..."
    ./node_modules/.bin/prisma migrate deploy
    ;;
  *)
    echo "DB_SCHEMA_MODE inválido: $mode" >&2
    exit 1
    ;;
esac

echo "Iniciando processo: $*"
exec "$@"
