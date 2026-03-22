#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

echo "=== thin-path proof: autoprop ==="
make autoprop-smoke

echo
echo "=== thin-path proof: full demo ==="
make full-demo-smoke

echo
echo "=== thin-path proof: bounded follower proof ==="
./ops/demo-smoke-follower.sh

echo
echo "=== thin-path proof: final snapshot ==="
./ops/install-path-status.sh

echo
echo "PASS thin-path-proof"
