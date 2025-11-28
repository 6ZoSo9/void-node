#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

CFG="${1:-config/void-mainnet-bootstrap-dev.json}"

echo "=== VOID mainnet bootstrap DEV (JSON end-to-end sanity) ==="
echo "[all] config path: $CFG"
echo

echo "=== [1] jq config preview ==="
./ops/void-mainnet-config-preview.sh "$CFG"
echo

echo "=== [2] LIVE JSON validator ==="
./ops/void-mainnet-bootstrap-mainnet-live-validate.sh "$CFG"
echo

echo "=== [3] JSON dry-run planner ==="
./ops/void-mainnet-bootstrap-mainnet-dryrun.sh "$CFG"
echo

echo "=== [4] Foundry FromJson script (read-only) ==="
./ops/void-mainnet-bootstrap-dev-from-json.sh
echo

echo "=== DONE: DEV JSON sanity pipeline completed ==="
