#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

echo "=== [1] install path status ==="
./ops/install-path-status.sh

echo
echo "=== [2] live demo smoke ==="
./ops/demo-smoke-main.sh

echo
echo "=== [3] follower sync proof ==="
./ops/demo-smoke-follower.sh

echo
echo "=== [4] final status ==="
./ops/install-path-status.sh

echo
echo "PASS post-install-demo"
