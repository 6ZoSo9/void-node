#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== submit path truth json ==="
curl -fsS --max-time 5 "$BASE/__void/diag/submit_path_truth.json" ; echo
echo

echo "=== submit path truth prom ==="
curl -fsS --max-time 5 "$BASE/__void/metrics/submit_path_truth.prom" ; echo
echo

echo "=== proposer status ==="
curl -fsS --max-time 5 "$BASE/proposer/status" ; echo
echo

echo "=== mempool truth ==="
curl -fsS --max-time 5 "$BASE/mempool/count" ; echo
curl -fsS --max-time 5 "$BASE/proposer/queue/size" ; echo
