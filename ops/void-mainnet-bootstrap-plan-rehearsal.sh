#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet bootstrap PLAN rehearsal harness.
# This does NOT broadcast to real mainnet. It assumes RPC_URL points to a
# local anvil-2050 or equivalent dev chain and runs:
#   - PLAN summary
#   - PLAN structural checklist
#   - PLAN simulation (forge script, expect stub/plan behavior)
#
# It is a human-facing "see what we would do" wrapper.

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"

if git rev-parse --show-toplevel >/dev/null 2>&1; then
  cd "$(git rev-parse --show-toplevel)"
fi

echo "=== [mainnet-bootstrap-plan-rehearsal] VOID mainnet PLAN rehearsal ==="
echo "[cfg] REPO_ROOT   = $(pwd)"
echo "[cfg] RPC_URL     = $RPC_URL"
echo "[cfg] CONFIG_PATH = $CONFIG_PATH"
echo

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "[rehearsal] ERROR: config file not found: $CONFIG_PATH" >&2
  exit 1
fi

echo "=== [0] chainId sanity via cast (optional) ==="
if command -v cast >/dev/null 2>&1; then
  CHAIN_ID_RPC=$(cast chain-id --rpc-url "$RPC_URL" 2>/dev/null || echo "ERR")
  echo "  chainId (RPC) = $CHAIN_ID_RPC"
else
  echo "  cast not found; skipping RPC chainId check"
fi
echo

echo "=== [1] PLAN summary (LIVE JSON) ==="
./ops/void-mainnet-bootstrap-plan-summary.sh
echo

echo "=== [2] PLAN structural checklist ==="
if ./ops/void-mainnet-bootstrap-plan-checklist.sh; then
  CHECKLIST_OK=1
else
  CHECKLIST_OK=0
  echo "[rehearsal] WARNING: checklist reported NOT_READY"
fi
echo

echo "=== [3] PLAN simulation (stub/plan forge script) ==="
if ./ops/void-mainnet-bootstrap-plan-sim.sh; then
  SIM_OK=1
else
  SIM_OK=0
  echo "[rehearsal] WARNING: plan-sim exited non-zero (expected if stub reverts)"
fi
echo

echo "=== [rehearsal summary] ==="
echo "  checklist_ok = $CHECKLIST_OK"
echo "  sim_ok       = $SIM_OK"

if [[ "$CHECKLIST_OK" == "1" && "$SIM_OK" == "1" ]]; then
  echo "[rehearsal] RESULT: OK (PLAN rehearsal passed on current config + RPC)"
  exit 0
fi

echo "[rehearsal] RESULT: NOT_OK (PLAN not ready or simulation failed)"
exit 1
