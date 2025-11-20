#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="[agent-complete-one]"

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "$SCRIPT_NAME starting..."
echo "$SCRIPT_NAME repo=$REPO_DIR"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="${STATE_FILE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"

echo "$SCRIPT_NAME rpc_url=$RPC_URL"
echo "$SCRIPT_NAME state_file=$STATE_FILE"

if [ ! -f "$STATE_FILE" ]; then
  echo "$SCRIPT_NAME ERROR: state file not found at $STATE_FILE" >&2
  exit 1
fi

if [ ! -x "./ops/void-devnet-agent-submit-receipt.sh" ]; then
  echo "$SCRIPT_NAME ERROR: ./ops/void-devnet-agent-submit-receipt.sh not found or not executable" >&2
  exit 1
fi

echo "$SCRIPT_NAME running agent-submit-receipt (will probe spool for next_pending_job)..."
RPC_URL="$RPC_URL" STATE_FILE="$STATE_FILE" ./ops/void-devnet-agent-submit-receipt.sh

echo
echo "$SCRIPT_NAME running spool-health for summary..."
RPC_URL="$RPC_URL" ./ops/void-devnet-spool-health.sh || {
  echo "$SCRIPT_NAME WARNING: spool-health failed (non-fatal)" >&2
}

echo
echo "$SCRIPT_NAME DONE"
