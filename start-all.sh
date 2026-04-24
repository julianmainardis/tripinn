#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
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

echo "==> Starting MongoDB container..."
cd "$ROOT_DIR"
docker compose up -d mongo

echo "==> Preparing backend..."
cd "$BACKEND_DIR"
python3 -m venv .venv
source .venv/bin/activate
if [[ ! -f ".env" ]]; then
  cp .env.example .env
fi
python -m pip install --upgrade pip >/dev/null
pip install -r requirements.txt >/dev/null

echo "==> Starting backend on http://127.0.0.1:8000 ..."
python server.py &
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
echo "- MongoDB: docker container 'tripinn-mongo'"
echo "- Backend:  http://127.0.0.1:8000"
echo "- Expo:     waiting on http://localhost:8081"
echo ""
echo "Press Ctrl+C here to stop backend."
