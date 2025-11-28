#!/usr/bin/env bash
set -euo pipefail

echo "=== VOID mainnet dev bootstrap HEALTH-ALL ==="

# Always run from repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

RPC="${ANVIL_RPC:-http://127.0.0.1:8545}"
echo "[env] REPO_ROOT=${REPO_ROOT}"
echo "[env] RPC=${RPC}"

echo
echo "=== [1] verify core wiring + tokenomics ==="
./ops/void-mainnet-dev-bootstrap-verify-core.sh

echo
echo "=== [2] dump state snapshot (addresses + tokenomics) ==="
./ops/void-mainnet-dev-bootstrap-dump-state.sh

echo
echo "=== RESULT: DEV BOOTSTRAP HEALTH-ALL OK (verify-core + state snapshot) ==="
echo "State file:"
echo "  config/void-mainnet-bootstrap-dev.state.json"
