#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

echo "=== install-all: devbox install/build ==="
./ops/install-devbox-ubuntu.sh

echo
echo "=== install-all: user units ==="
./ops/install-user-units.sh

echo
echo "=== install-all: first-run smoke ==="
./ops/first-run-smoke.sh

echo
echo "=== install-all: canonical thin-path proof ==="
./ops/thin-path-proof.sh

echo
echo "PASS install-all"
