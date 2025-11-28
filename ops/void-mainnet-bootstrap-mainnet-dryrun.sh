#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet bootstrap MAINNET-DRYRUN (LINT + PLAN, no txs)
#
# This script:
#   1) Lints a *mainnet* bootstrap JSON (offline).
#   2) Runs the PLAN script (read-only) against a given RPC.
#
# It does NOT send any transactions. It only calls:
#   - ops/void-mainnet-bootstrap-mainnet-lint.sh
#   - ops/void-mainnet-bootstrap-plan.sh
#
# Usage (recommended, with anvil on 2050):
#   ./ops/void-mainnet-bootstrap-mainnet-dryrun.sh \
#     --config config/void-mainnet-bootstrap-mainnet.template.json \
#     --rpc    http://127.0.0.1:8545

CONFIG=""
RPC_URL="http://127.0.0.1:8545"

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
      echo "Usage: $0 --config <config.json> [--rpc <rpc-url>]"
      echo
      echo "MAINNET-DRYRUN (LINT + PLAN only, no txs)."
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

# Default config if none provided
if [[ -z "${CONFIG:-}" ]]; then
  if [[ -f config/void-mainnet-bootstrap-mainnet.template.json ]]; then
    CONFIG="config/void-mainnet-bootstrap-mainnet.template.json"
  else
    echo "[ERROR] --config is required and default template not found." >&2
    exit 1
  fi
fi

if [[ ! -f "$CONFIG" ]]; then
  echo "[ERROR] config file not found: $CONFIG" >&2
  exit 1
fi

echo "=== VOID mainnet bootstrap MAINNET-DRYRUN ==="
echo "[info] CONFIG = $CONFIG"
echo "[info] RPC    = $RPC_URL"
echo

echo "=== [STEP 1] MAINNET-LINT (offline) ==="
./ops/void-mainnet-bootstrap-mainnet-lint.sh --config "$CONFIG"
echo

echo "=== [STEP 2] PLAN (read-only against RPC) ==="
./ops/void-mainnet-bootstrap-plan.sh \
  --config "$CONFIG" \
  --rpc    "$RPC_URL"

echo
echo "=== RESULT: MAINNET DRYRUN COMPLETED (LINT+PLAN, no txs) ==="
