#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

echo "=== install-all: devbox ==="
./ops/install-devbox-ubuntu.sh

echo
echo "=== install-all: user units ==="
./ops/install-user-units.sh

echo
echo "=== install-all: first-run smoke ==="
./ops/first-run-smoke.sh

echo
echo "PASS install-all"
