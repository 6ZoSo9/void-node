#!/usr/bin/env bash
set -euo pipefail

#
# ops/void-mainnet-bootstrap-mainnet-broadcast.sh
#
# HARD-DISABLED SKELETON for the REAL VOID mainnet bootstrap broadcast.
#
# This script must NOT be enabled or edited casually.
# Only touch it after:
#   - Real mainnet keys ceremony is complete (LUKS / hardware).
#   - config/void-mainnet-bootstrap-mainnet.live.json is fully populated
#     with FINAL public addresses (no 0x0000..., no 0x1111... sentinels).
#   - You have double-checked the PLAN via:
#         ops/void-mainnet-bootstrap-plan-dev.sh
#         ops/void-mainnet-bootstrap-plan-live.sh
#   - All mainnet health / pillars / plan gates are green.
#

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
LIVE_CFG="${LIVE_CFG:-config/void-mainnet-bootstrap-mainnet.live.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

cd "$REPO_ROOT"

echo "=== [mainnet-broadcast] VOID mainnet bootstrap BROADCAST skeleton ==="
echo "[broadcast] REPO_ROOT = $REPO_ROOT"
echo "[broadcast] LIVE_CFG  = $LIVE_CFG"
echo "[broadcast] RPC_URL   = $RPC_URL"
echo

echo "[broadcast][FATAL] This script is intentionally DISABLED."
echo "[broadcast][FATAL] Do NOT enable until:"
echo "  - Real mainnet keys are generated and stored safely (LUKS / hardware)."
echo "  - LIVE JSON has FINAL public addresses, no sentinels."
echo "  - We have walked the PLAN (dev + live) and signed off on it."
echo
echo "[broadcast][FATAL] When the time comes, we will:"
echo "  1) Rehearse with plan() (no broadcasts) against LIVE JSON."
echo "  2) Print a human-readable step-by-step bootstrap plan."
echo "  3) ONLY THEN wire in run() + --broadcast, with explicit flags."
echo
exit 1

# ---------------------------------------------------------------------------
# FUTURE-ONLY (commented) SKETCH — DO NOT UNCOMMENT YET
# ---------------------------------------------------------------------------
#
# echo "[broadcast] sanity: reading chainId from RPC..."
# if command -v cast >/dev/null 2>&1; then
#   CHAIN_ID="$(cast chain-id --rpc-url "$RPC_URL" 2>/dev/null || echo "ERR")"
# else
#   CHAIN_ID="ERR"
# fi
#
# if [ "$CHAIN_ID" != "2050" ]; then
#   echo "[broadcast][FATAL] RPC chainId is not 2050 (got: $CHAIN_ID)" >&2
#   exit 1
# fi
#
# echo "[broadcast] dry PLAN rehearsal against LIVE JSON (no broadcasts)..."
# forge script \
#   script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
#   --rpc-url "$RPC_URL" \
#   --sig "plan(string)" "$LIVE_CFG"
#
# echo
# echo "[broadcast] *** LAST CHANCE TO ABORT ***"
# echo "[broadcast] When ready, the real broadcast step will look roughly like:"
# echo
# echo "  forge script \\"
# echo "    script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \\"
# echo "    --rpc-url \$RPC_URL \\"
# echo "    --broadcast \\"
# echo "    --sig \"run(string)\" \"\$LIVE_CFG\""
# echo
# echo "[broadcast] This block will only be enabled once we have FINAL keys + PLAN."
# ---------------------------------------------------------------------------
