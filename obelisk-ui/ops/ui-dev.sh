#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-5173}"
HOST="${HOST:-127.0.0.1}"

echo "=== [ui-dev] killing old vite on $HOST:$PORT (best-effort) ==="
fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true

echo "=== [ui-dev] starting vite on $HOST:$PORT ==="
exec npm run dev -- --host "$HOST" --port "$PORT"
