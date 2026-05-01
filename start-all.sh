#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend-nest"
FRONTEND_DIR="$ROOT_DIR/frontend"

BACKEND_PID=""

cleanup() {
  echo ""
  echo "Stopping services..."
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" || true
  fi
  echo "Done."
}

trap cleanup EXIT INT TERM

echo "==> Checking Docker daemon..."
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Open Docker Desktop and run this script again."
  exit 1
fi

echo "==> Starting PostgreSQL container..."
cd "$ROOT_DIR"
docker compose up -d postgres

echo "==> Preparing backend..."
cd "$BACKEND_DIR"
if [[ ! -f ".env" ]]; then
  cp .env.example .env
fi
if [[ ! -d "node_modules" ]]; then
  npm install
fi
npx prisma generate
npx prisma migrate deploy

echo "==> Starting NestJS backend on http://127.0.0.1:8000 ..."
npm run start:dev &
BACKEND_PID=$!

echo "==> Preparing frontend..."
cd "$FRONTEND_DIR"
if [[ ! -d "node_modules" ]]; then
  npm install
fi
if [[ ! -f ".env" ]]; then
  cp .env.example .env
fi

echo "==> Starting Expo (Metro) ..."
npx expo start --ios -c

echo ""
echo "All services started."
echo "- PostgreSQL: docker container 'tripinn-postgres'"
echo "- Backend:    http://127.0.0.1:8000"
echo "- Expo:       waiting on http://localhost:8081"
echo ""
echo "Press Ctrl+C here to stop backend."
