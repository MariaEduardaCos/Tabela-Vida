#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/tabela-de-vida"

echo "======================================================================"
echo " Iniciando Frontend Web SPA (Angular Standalone + Signals + Leaflet)"
echo " Porta padrão: 4200 -> http://localhost:4200"
echo "======================================================================"

if command -v fuser >/dev/null 2>&1; then
  fuser -k 4200/tcp >/dev/null 2>&1 || true
fi

cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
  echo "[start-frontend.sh] Instalando dependências do frontend Angular..."
  npm install
fi

echo "[start-frontend.sh] Subindo servidor Angular (ng serve) na porta 4200..."
exec npx ng serve --port 4200 --host 0.0.0.0

