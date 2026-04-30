#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

ALIEN="${ALIEN:-zoso@100.122.79.39}"

echo "=== Mainnet-0 cross-box status smoke ==="

echo
echo "=== [1] local truth ==="
git rev-parse --short HEAD
git describe --tags --always --dirty
git status --short

echo
echo "=== [2] local smoke ==="
make mainnet0-status-smoke

echo
echo "=== [3] alien sync truth ==="
ssh "$ALIEN" '
set -euo pipefail
cd /home/zoso/dev/void-node

echo "alien_head=$(git rev-parse --short HEAD)"
echo "alien_describe=$(git describe --tags --always --dirty)"
git status --short
'

echo
echo "=== [4] alien smoke ==="
ssh "$ALIEN" '
set -euo pipefail
cd /home/zoso/dev/void-node
make mainnet0-status-smoke
'

echo
echo "[ok] Mainnet-0 cross-box status smoke passed"
