#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

echo "======================================================================"
echo " Iniciando Backend REST (NestJS + TypeScript + PostgreSQL)"
echo " Porta padrão: 3000 -> http://localhost:3000/api"
echo "======================================================================"

# Libera a porta 3000 caso algum container ou processo antigo esteja ocupando
if command -v docker >/dev/null 2>&1; then
  CONFLICT_CONTAINER=$(docker ps --filter "publish=3000" --format "{{.ID}}" 2>/dev/null || true)
  if [ -n "$CONFLICT_CONTAINER" ]; then
    echo "[start-backend.sh] Parando container Docker que ocupava a porta 3000 ($CONFLICT_CONTAINER)..."
    docker stop $CONFLICT_CONTAINER >/dev/null 2>&1 || true
  fi
fi

if command -v fuser >/dev/null 2>&1; then
  fuser -k 3000/tcp >/dev/null 2>&1 || true
fi

cd "$BACKEND_DIR"

if [ ! -d "node_modules" ]; then
  echo "[start-backend.sh] Instalando dependências do backend..."
  npm install
fi

echo "[start-backend.sh] Compilando TypeScript (strict: true)..."
npm run build

echo "[start-backend.sh] Subindo AppServer na porta ${PORT:-3000}..."
exec npm start

