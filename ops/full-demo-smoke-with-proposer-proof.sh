#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== [1] full demo smoke ==="
bash "$ROOT/ops/full-demo-smoke.sh"

echo
echo "=== [2] proposer rescue ping proof ==="
bash "$ROOT/ops/proposer-rescue-ping-proof.sh"

echo
echo "[GREEN] full demo smoke + proposer rescue ping proof"
