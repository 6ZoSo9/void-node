#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"

echo "=== [workcredits devnet · obelisk-ui] ==="
echo "ROOT = $ROOT"

cd "$ROOT"

echo
echo "=== [1] ensure WorkCredits devnet helper is running (port 4312) ==="
./ops/void-workcredits-devnet-ui-open.sh

echo
echo "=== [2] start Obelisk WorkCredits devnet UI (Vite on 5173) ==="
cd "$ROOT/obelisk-ui"

echo "[info] running: npm run dev"
echo "       then open: http://127.0.0.1:5173/"
echo

npm run dev
