#!/usr/bin/env bash
set -euo pipefail

STATE="${STATE:-./docs/VOID-DEVNET-PROTOCOL-STATE.json}"

# If the state file doesn't exist, emit a harmless warning shell line
if [ ! -f "$STATE" ]; then
  cat <<EOF
echo "[env] missing state file: $STATE" >&2
EOF
  exit 0
fi

# Helper: read either {"address": "..."} or plain "0x..." for a given key
addr() {
  local key="$1"
  jq -r --arg k "$key" '
    .[$k] // empty
    | if type == "string" then . else .address end
  ' "$STATE"
}

chain_id="$(jq -r '.chainId // empty' "$STATE")"
admin_gate_addr="$(addr "AdminGate")"
jobqueue_addr="$(addr "JobQueue")"
receiptreg_addr="$(addr "ReceiptRegistry")"
datasetreg_addr="$(addr "DatasetRegistry")"
modelreg_addr="$(addr "ModelRegistry")"
agentreg_addr="$(addr "AgentRegistry")"

cat <<EOF
export RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
export VOID_DEVNET_CHAINID="${chain_id}"

export ADMIN_GATE_ADDR="${admin_gate_addr}"
export JOBQUEUE_ADDR="${jobqueue_addr}"
export RECEIPTREG_ADDR="${receiptreg_addr}"
export DATASETREG_ADDR="${datasetreg_addr}"
export MODELREG_ADDR="${modelreg_addr}"
export AGENTREG_ADDR="${agentreg_addr}"
EOF
