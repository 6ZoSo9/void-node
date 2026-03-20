#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${ROOT:-$HOME/dev/void-node}"

echo "=== demo bootstrap: deps + build ==="
npm install
npm run build

echo
echo "=== demo bootstrap: required files ==="
test -f ops/autoprop-smoke.sh
test -f ops/submit-path-truth-smoke.sh
test -f ops/void-follow-once.sh
test -f ops/void-follower-status.sh
echo "PASS bootstrap"
