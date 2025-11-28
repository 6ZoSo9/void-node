#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== VOID mainnet dev bootstrap (full pipeline) ==="
echo "[info] This script follows docs/VOID-MAINNET-BOOTSTRAP-STEPS.txt"
echo

# Configurable bits
DEV_CONFIG="config/void-mainnet-bootstrap-dev.json"
DEV_DRIVER="/tmp/void-mainnet-bootstrap-dev-run.sh"
DEV_INVARIANTS="ops/void-mainnet-tokenomics-dev-invariants.sh"

ANVIL_RPC="${ANVIL_RPC:-http://127.0.0.1:8545}"
ANVIL_CHAINID="${ANVIL_CHAINID:-2050}"

# ---------------------------------------------------------------------------
# [STEP 01] Repo / branch / environment sanity
# ---------------------------------------------------------------------------
echo "=== [STEP 01] Repo / branch / environment sanity ==="
BRANCH=$(git rev-parse --abbrev-ref HEAD || echo "<unknown>")
echo "[step01] git branch: $BRANCH"
echo "[step01] pwd: $(pwd)"

if [ ! -x "$(command -v forge || true)" ]; then
  echo "[step01] WARNING: forge not found on PATH; assuming tests were run elsewhere."
fi

echo "[step01] NOTE: We expect forge test to already be green."
echo "[step01] ANVIL_RPC    = ${ANVIL_RPC}"
echo "[step01] ANVIL_CHAINID= ${ANVIL_CHAINID}"
echo

# ---------------------------------------------------------------------------
# [STEP 02] Load bootstrap config (dev)
# ---------------------------------------------------------------------------
echo "=== [STEP 02] Load dev bootstrap config ==="
if [ ! -f "$DEV_CONFIG" ]; then
  echo "[step02] FATAL: missing $DEV_CONFIG" >&2
  exit 1
fi

echo "[step02] using config: $DEV_CONFIG"
jq '. | {chainId, networkName, roles, validators}' "$DEV_CONFIG" 2>/dev/null || cat "$DEV_CONFIG"
echo

# ---------------------------------------------------------------------------
# [STEP 03] Deploy and wire core contracts (dev driver)
# ---------------------------------------------------------------------------
echo "=== [STEP 03] Deploy and wire core contracts (dev) ==="
if [ ! -x "$DEV_DRIVER" ]; then
  echo "[step03] FATAL: missing or non-executable dev driver: $DEV_DRIVER" >&2
  echo "[step03] Expecting /tmp/void-mainnet-bootstrap-dev-run.sh from earlier steps." >&2
  exit 1
fi

echo "[step03] running dev driver: $DEV_DRIVER"
"$DEV_DRIVER"
echo "[step03] dev driver completed."
echo

# ---------------------------------------------------------------------------
# [STEP 04] Move premine into VoidTreasury (within dev driver)
# ---------------------------------------------------------------------------
echo "=== [STEP 04] Move premine into VoidTreasury (dev) ==="
echo "[step04] NOTE: Premine -> VoidTreasury transfer is handled INSIDE the dev driver."
echo "[step04] This step is a documentation anchor to match mainnet STEP 04."
echo

# ---------------------------------------------------------------------------
# [STEP 05] Fund OpsTreasury and validator(s) (within dev driver)
# ---------------------------------------------------------------------------
echo "=== [STEP 05] Fund OpsTreasury and validator(s) (dev) ==="
echo "[step05] NOTE: Treasury -> OpsTreasury and validator funding is handled INSIDE the dev driver."
echo "[step05] This step is a documentation anchor to match mainnet STEP 05."
echo

# ---------------------------------------------------------------------------
# [STEP 06] RewardEngine wiring and validator claim() (within dev driver)
# ---------------------------------------------------------------------------
echo "=== [STEP 06] RewardEngine wiring and validator claim() (dev) ==="
echo "[step06] NOTE: RewardEngine wiring and claim() should be part of the dev driver run."
echo "[step06] This step is a documentation anchor to match mainnet STEP 06."
echo

# ---------------------------------------------------------------------------
# [STEP 07] Tokenomics invariants and final checks
# ---------------------------------------------------------------------------
echo "=== [STEP 07] Tokenomics invariants and final checks (dev) ==="
if [ ! -x "$DEV_INVARIANTS" ]; then
  echo "[step07] FATAL: missing or non-executable invariants script: $DEV_INVARIANTS" >&2
  exit 1
fi

echo "[step07] running dev tokenomics invariants: $DEV_INVARIANTS"
"$DEV_INVARIANTS"
echo "[step07] invariants script completed."
echo

# ---------------------------------------------------------------------------
# [STEP 08] Archive manifest and receipts (dev)
# ---------------------------------------------------------------------------
echo "=== [STEP 08] Archive manifest and receipts (dev) ==="
echo "[step08] NOTE: Dev bootstrap state should already be recorded in:"
echo "    docs/VOID-MAINNET-DEV-BOOTSTRAP-STATE.txt"
echo "[step08] If anything changed, update that doc with addresses/tx hashes."
echo

echo "=== DONE: dev bootstrap pipeline completed according to STEP 01–08 ==="
