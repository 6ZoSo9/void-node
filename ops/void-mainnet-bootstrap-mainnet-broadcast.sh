#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet bootstrap broadcast harness
# Modes:
#   default / "plan" : no broadcasts, just PLAN + readiness
#   "run"            : re-check, prompt, then forge script --broadcast

cd "$(dirname "$0")/.."

REPO_ROOT="$(pwd)"
LIVE_CFG="config/void-mainnet-bootstrap-mainnet.live.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
MODE="${1:-plan}"

echo "=== [mainnet-broadcast] VOID mainnet bootstrap BROADCAST harness ==="
echo "[cfg] REPO_ROOT = ${REPO_ROOT}"
echo "[cfg] LIVE_CFG  = ${LIVE_CFG}"
echo "[cfg] RPC_URL   = ${RPC_URL}"
echo "[cfg] MODE      = ${MODE}"
echo

if [ ! -f "${LIVE_CFG}" ]; then
  echo "[FATAL] LIVE config ${LIVE_CFG} not found" >&2
  exit 1
fi

# 1) Always show current PLAN summary
echo "---- [1] PLAN summary (live.json) ----"
./ops/void-mainnet-bootstrap-plan-summary.sh
echo

# 2) Always run readiness gates (PLAN, pillars, lastmile, safeboot, broadcast-gates)
echo "---- [2] Mainnet bootstrap readiness (gates) ----"
./ops/void-mainnet-bootstrap-readiness.sh
echo

if [ "${MODE}" != "run" ]; then
  echo "[broadcast] MODE != run -> PLAN/READINESS ONLY (no txs sent)."
  echo "[broadcast] To actually broadcast, run:"
  echo "  ./ops/void-mainnet-bootstrap-mainnet-broadcast.sh run"
  exit 0
fi

echo "---- [3] FINAL CONFIRMATION ----"
echo "You are about to broadcast VOID mainnet bootstrap transactions to:"
echo "  RPC_URL = ${RPC_URL}"
echo
echo "Make sure:"
echo "  - RPC_URL points at the REAL VOID mainnet endpoint you control."
echo "  - VOID mainnet node is healthy and at the expected genesis/height."
echo "  - VOIDKEY2 (or equivalent) is mounted ONLY on this trusted machine."
echo "  - Foundry is configured so the deployer account matches:"
echo "      deployer = 0x553dF3F66c43c178046529B5A0DCbe940200fea1"
echo
read -r -p "Type EXACTLY 'VOID-MAINNET' to confirm broadcast: " CONFIRM
if [ "${CONFIRM}" != "VOID-MAINNET" ]; then
  echo "[broadcast] Confirmation mismatch; aborting."
  exit 1
fi

echo
echo "---- [4] forge script broadcast ----"
echo "[broadcast] Executing VoidMainnetBootstrapMainnet::run against ${RPC_URL}"
echo

# NOTE: This assumes Foundry is configured so that the correct deployer
# key is used (via keystore, hardware wallet, or other secure method).
forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --rpc-url "${RPC_URL}" \
  --broadcast \
  --slow \
  --sig "run(string)" "${LIVE_CFG}"

echo
echo "---- [5] POST-BROADCAST REMINDERS ----"
echo "- Verify deployed contract addresses against the PLAN/dev rehearsal."
echo "- Update your LIVE JSON with the actual on-chain addresses (if needed)."
echo "- Re-run any post-boot health scripts and Prometheus checks."
echo "- Unmount and remove VOIDKEY2 when finished."
