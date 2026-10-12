#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

echo "NOTE: canonical proof path is ./ops/thin-path-proof.sh"
echo "NOTE: this script is now a compatibility wrapper and does not recurse"
echo

echo "=== [1] install path status snapshot ==="
./ops/install-path-status.sh

echo
echo "=== [2] main bounded proof ==="
./ops/demo-smoke-main.sh

echo
echo "=== [3] follower bounded proof ==="
./ops/demo-smoke-follower.sh

echo
echo "=== [4] final snapshot ==="
./ops/install-path-status.sh

echo
echo "PASS post-install-demo"
