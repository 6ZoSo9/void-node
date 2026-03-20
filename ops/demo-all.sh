#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${ROOT:-$HOME/dev/void-node}"

./ops/demo-bootstrap.sh
echo
./ops/demo-start-main.sh
echo
./ops/demo-smoke-main.sh
echo
./ops/demo-smoke-follower.sh
echo
echo "PASS demo-all"
