#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet bootstrap BROADCAST harness
# Modes:
#   (no args) / plan  -> PLAN summary + readiness only, no txs
#   run               -> re-check gates, then forge script --broadcast with keystore

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

LIVE_CFG="config/void-mainnet-bootstrap-mainnet.live.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

# Default keystore location on LUKS USB (can override with VOID_MAINNET_KEYSTORE)
KEYSTORE_DEFAULT="/media/zoso/VOIDKEY2/void-mainnet-keys/mainnet_deployer.json"
KEYSTORE="${VOID_MAINNET_KEYSTORE:-$KEYSTORE_DEFAULT}"

MODE="${1:-plan}"

echo "=== [mainnet-broadcast] VOID mainnet bootstrap BROADCAST harness ==="
echo "[cfg] REPO_ROOT = ${REPO_ROOT}"
echo "[cfg] LIVE_CFG  = ${LIVE_CFG}"
echo "[cfg] RPC_URL   = ${RPC_URL}"
echo "[cfg] KEYSTORE  = ${KEYSTORE}"
echo "[cfg] MODE      = ${MODE}"
echo

# Basic sanity checks
if [ ! -f "$LIVE_CFG" ]; then
  echo "[FATAL] LIVE_CFG not found: $LIVE_CFG"
  exit 1
fi

if [ ! -f "$KEYSTORE" ]; then
  echo "[FATAL] keystore not found: $KEYSTORE"
  echo "        Is VOIDKEY2 LUKS mounted and void-mainnet-keys present?"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[FATAL] jq is required but not found in PATH."
  exit 1
fi

DEPLOYER="$(jq -r '.roles.deployer' "$LIVE_CFG")"
if [ -z "${DEPLOYER}" ] || [ "${DEPLOYER}" = "null" ] || [ "${DEPLOYER}" = "0x0000000000000000000000000000000000000000" ]; then
  echo "[FATAL] Invalid deployer in LIVE_CFG: ${DEPLOYER}"
  exit 1
fi

echo "[cfg] DEPLOYER = ${DEPLOYER}"
echo

echo "---- [1] PLAN summary (live.json) ----"
./ops/void-mainnet-bootstrap-plan-summary.sh || {
  echo
  echo "[FATAL] plan-summary failed; see output above."
  exit 1
}

echo
echo "---- [2] Mainnet bootstrap readiness (gates) ----"
./ops/void-mainnet-bootstrap-readiness.sh || {
  echo
  echo "[FATAL] readiness script failed; see output above."
  exit 1
}

if [ "$MODE" != "run" ]; then
  echo
  echo "[broadcast] MODE != run -> PLAN/READINESS ONLY (no txs sent)."
  echo "[broadcast] To actually broadcast, run:"
  echo "  $0 run"
  exit 0
fi

echo
echo "==== [RUN MODE] LIVE BROADCAST ABOUT TO HAPPEN ==== "
echo "Deployer address (from LIVE_CFG): ${DEPLOYER}"
echo "RPC URL: ${RPC_URL}"
echo "Keystore: ${KEYSTORE}"
echo
echo "This will:"
echo "  - Use forge script with --keystore (encrypted JSON on VOIDKEY2)"
echo "  - Prompt you for the keystore password"
echo "  - Send LIVE VOID mainnet bootstrap txs to chainId 2050 via ${RPC_URL}"
echo
echo "If ANY of this looks wrong: Ctrl-C NOW."
echo

read -r -p "Type 'VOID-ARMED' to continue with LIVE broadcast: " CONFIRM
if [ "${CONFIRM}" != "VOID-ARMED" ]; then
  echo "[broadcast] Confirmation failed; aborting."
  exit 1
fi

echo
echo "---- [3] forge script LIVE RUN (with keystore + broadcast) ----"
set -x
forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --rpc-url "${RPC_URL}" \
  --broadcast \
  --sender "${DEPLOYER}" \
  --keystore "${KEYSTORE}" \
  --sig "run(string)" "${LIVE_CFG}"
set +x

echo
echo "==== [DONE] forge script exited successfully (no set -e abort) ===="
echo "Next steps:"
echo "  - Verify contracts on chain (AdminGate/UpdateGate/ConfigGate/VoidToken/Treasury/RewardEngine/etc.)"
echo "  - Update docs with deployed addresses and tx hashes."
