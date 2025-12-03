#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

STATE_FILE="$REPO_ROOT/docs/VOID-DEVNET-PROTOCOL-STATE.json"

echo "=== [devnet-deploy-stub] VOID devnet deploy stubs (PLAN ONLY) ==="
echo "REPO_ROOT = $REPO_ROOT"
echo "RPC_URL   = $RPC_URL"
echo

if [[ -f "$STATE_FILE" ]]; then
  echo "--- [1] Current devnet protocol state (best-effort) ---"
  # Prefer a focused jq view if available, else just dump the head.
  if command -v jq >/dev/null 2>&1; then
    jq '{chainId, network, JobQueue, ReceiptRegistry, AgentRegistry, ModelRegistry, DatasetRegistry}' \
      "$STATE_FILE" 2>/dev/null || sed -n '1,40p' "$STATE_FILE"
  else
    sed -n '1,40p' "$STATE_FILE"
  fi
else
  echo "WARN: devnet state file not found:"
  echo "  $STATE_FILE"
  echo "You can regenerate it via the devnet ops scripts."
fi

echo
echo "--- [2] PLAN-ONLY deploy skeleton ---"
echo "This slot is reserved for future devnet deploy flows, for example:"
echo "  - Deploying a fresh JobQueue / AgentRegistry / ModelRegistry / DatasetRegistry"
echo "  - Rehearsing contract wiring using forge script dry-runs"
echo
echo "Right now this script does NOT:"
echo "  - Broadcast any transactions"
echo "  - Change devnet state"
echo
echo "It exists so the Obelisk console menu layout is ready for:"
echo "  Devnet -> Deploy -> {protocol, agents, models, etc.}"
echo
read -r -p "Press ENTER to return to menu..." _
