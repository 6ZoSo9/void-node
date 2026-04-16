#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== [1] full demo smoke ==="
bash "$ROOT/ops/full-demo-smoke.sh"

echo
echo "=== [2] canonical datanet accepted-receipt proof ==="
bash "$ROOT/ops/datanet-canonical-proof.sh"

echo
echo "=== [3] proposer rescue ping proof ==="
bash "$ROOT/ops/proposer-rescue-ping-proof.sh"

echo
echo "[GREEN] full demo smoke + canonical datanet proof + proposer rescue ping proof"
