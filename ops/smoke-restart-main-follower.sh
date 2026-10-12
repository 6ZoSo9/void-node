#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

echo "=== restart services ==="
systemctl --user restart void-node.service
systemctl --user restart void-node@bootstrap-1.service
sleep 6

echo
echo "=== status after restart ==="
./ops/void-follower-status.sh

echo
echo "=== run smoke ==="
./ops/smoke-main-follower.sh
