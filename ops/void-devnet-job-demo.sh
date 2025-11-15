#!/usr/bin/env bash
set -euo pipefail

REPO=${REPO:-$(pwd)}
RPC_URL=${RPC_URL:-http://127.0.0.1:8545}
STATE_JSON=${STATE_JSON:-"$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json"}

echo "[job-demo] repo:     $REPO"
echo "[job-demo] RPC_URL:  $RPC_URL"
echo "[job-demo] STATE:    $STATE_JSON"

if [ ! -f "$STATE_JSON" ]; then
  echo "[job-demo][ERR] missing state file: $STATE_JSON" >&2
  echo "  -> run ./ops/void-devnet-bootstrap-stack.sh first." >&2
  exit 1
fi

chainId_json=$(jq -r '.chainId' "$STATE_JSON")
deployer=$(jq -r '.deployer' "$STATE_JSON")
token=$(jq -r '.VoidToken' "$STATE_JSON")
admin=$(jq -r '.AdminGate' "$STATE_JSON")

echo "[job-demo] chainId(json)   = $chainId_json"
echo "[job-demo] deployer        = $deployer"
echo "[job-demo] VoidToken       = $token"
echo "[job-demo] AdminGate       = $admin"

echo
echo "[job-demo] NOTE:"
echo "  This is a skeleton demo. It does NOT yet deploy JobQueue or registries"
echo "  on devnet. It just shows how future scripts will:"
echo "    - deploy AgentRegistry / DatasetRegistry / ModelRegistry / JobQueue"
echo "    - register an agent/model/dataset"
echo "    - post a job"
echo "    - simulate a claim + completion and print a receipt."
echo
echo "  Once we standardize the contract deployment scripts, this helper will be"
echo "  upgraded to perform a real end-to-end JobQueue flow using 'cast'."
