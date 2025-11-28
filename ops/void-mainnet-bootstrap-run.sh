#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet bootstrap RUN script (SKELETON)
#
# WARNING: This script is NOT IMPLEMENTED yet.
# It currently prints what it *would* do and then exits non-zero.
#
# When implemented, it will:
#   - Deploy and wire UpdateGate/AdminGate/ConfigGate (if not in genesis)
#   - Deploy ValidatorSet, VoidToken, VoidTreasury, OpsTreasury, RewardEngine
#   - Move premine into VoidTreasury
#   - Fund OpsTreasury and initial validators
#   - Wire RewardEngine and ValidatorSet
#   - Wire AdminGate/UpdateGate/ConfigGate owners
#
# Usage (future):
#   ./ops/void-mainnet-bootstrap-run.sh \
#     --config config/void-mainnet-bootstrap-mainnet.live.json \
#     --rpc    https://your-mainnet-rpc
#
# Right now, this is a NO-OP with a hard safety abort.

CONFIG=""
RPC_URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)
      CONFIG="$2"
      shift 2
      ;;
    --rpc)
      RPC_URL="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 --config <config.json> --rpc <rpc-url>"
      echo
      echo "NOTE: This is a SKELETON only. It does not send transactions yet."
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$CONFIG" ]]; then
  echo "[ERROR] --config is required" >&2
  exit 1
fi

if [[ -z "$RPC_URL" ]]; then
  echo "[ERROR] --rpc is required" >&2
  exit 1
fi

echo "=== VOID mainnet bootstrap RUN (SKELETON) ==="
echo "[info] CONFIG = $CONFIG"
echo "[info] RPC    = $RPC_URL"
echo
echo "[FATAL] This script is a skeleton and does NOT perform any writes yet."
echo "[FATAL] Implementation is intentionally blocked to prevent accidental mainnet bootstrap."
echo "[FATAL] When ready, we will implement step-by-step tx flows here, gated by env flags."

exit 2
