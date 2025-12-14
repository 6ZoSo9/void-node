#!/usr/bin/env bash
set -euo pipefail

### CONFIG / ENV ###

REPO="${REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO"

STATE_FILE="docs/VOID-DEVNET-PROTOCOL-STATE.json"

: "${RPC_URL:?RPC_URL must be set}"
: "${DEVNET_PRIVKEY:?DEVNET_PRIVKEY must be set}"

# Hard-lock: you MUST opt-in to broadcasting
if [[ "${DEVNET_BROADCAST:-0}" != "1" ]]; then
  echo "[system-deploy-v2] DEVNET_BROADCAST != 1"
  echo "[system-deploy-v2] Refusing to run a fake dry-run that corrupts state."
  echo "[system-deploy-v2] Export DEVNET_BROADCAST=1 if you really want to send txs."
  exit 1
fi

# Derive deployer address from the private key
if ! command -v cast >/dev/null 2>&1; then
  echo "[ERR] 'cast' not found in PATH"; exit 1
fi

DEPLOYER_ADDR=$(cast wallet address "$DEVNET_PRIVKEY")
echo "[system-deploy-v2] repo:    $REPO"
echo "[system-deploy-v2] RPC_URL: $RPC_URL"
echo "[system-deploy-v2] deployer: $DEPLOYER_ADDR"

CHAIN_ID="2050"   # VOID devnet; change only if you change the chain

### HELPER: forge create -> deployed address (JSON) ###

deploy_contract() {
  local out_var="$1"    # name of shell var to set
  local path="$2"       # e.g. contracts/ModelRegistry.sol
  local name="$3"       # e.g. ModelRegistry
  shift 3
  local ctor_args=("$@")

  echo "[deploy] $name (${path}:${name})"

  local forge_json
  if ! forge_json=$(
    forge create --json --broadcast "${path}:${name}" \
      --rpc-url "$RPC_URL" \
      --private-key "$DEVNET_PRIVKEY" \
      --constructor-args "${ctor_args[@]}" \
      --broadcast \
      --json
  ); then
    echo "[ERR] forge create --json --broadcast failed for ${name}"
    exit 1
  fi

  # Foundry JSON has "deployedTo"
  local addr
  addr=$(jq -r '.deployedTo // .deployedTo[0]' <<<"$forge_json" || true)

  if [[ ! "$addr" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
    echo "[ERR] could not parse deployed address for ${name}"
    echo "---- forge output ----"
    echo "$forge_json"
    echo "----------------------"
    exit 1
  fi

  printf -v "$out_var" '%s' "$addr"
  echo "[$name] deployed at $addr"
}

### ACTUAL DEPLOYS ###

# All four admin/master parameters are the deployer for devnet.
ADMIN_ADDR="$DEPLOYER_ADDR"
MASTER_KEY="$DEPLOYER_ADDR"

echo "[system-deploy-v2] chainId: $CHAIN_ID"
echo "[system-deploy-v2] admin/masterKey: $ADMIN_ADDR"

MODEL_REG_ADDR=""
DATASET_REG_ADDR=""
JOBQUEUE_ADDR=""
AGENT_REG_ADDR=""

deploy_contract MODEL_REG_ADDR   "contracts/ModelRegistry.sol"   "ModelRegistry"   "$ADMIN_ADDR"
deploy_contract DATASET_REG_ADDR "contracts/DatasetRegistry.sol" "DatasetRegistry" "$MASTER_KEY"
deploy_contract JOBQUEUE_ADDR    "contracts/JobQueue.sol"        "JobQueue"        "$ADMIN_ADDR"
deploy_contract AGENT_REG_ADDR   "contracts/AgentRegistry.sol"   "AgentRegistry"   "$ADMIN_ADDR"

### WRITE CLEAN STATE FILE ###

mkdir -p "$(dirname "$STATE_FILE")"

# Shape is:
# {
#   "chainId": 2050,
#   "AdminGate": "0x....",          // devnet master key / admin EOA
#   "ModelRegistry":   { "address": "0x..." },
#   "DatasetRegistry": { "address": "0x..." },
#   "JobQueue":        { "address": "0x..." },
#   "AgentRegistry":   { "address": "0x..." }
# }

tmp="${STATE_FILE}.tmp"

jq -n \
  --arg admin "$ADMIN_ADDR" \
  --arg mr   "$MODEL_REG_ADDR" \
  --arg ds   "$DATASET_REG_ADDR" \
  --arg jqc  "$JOBQUEUE_ADDR" \
  --arg ar   "$AGENT_REG_ADDR" \
  '{
     chainId: 2050,
     AdminGate: $admin,
     ModelRegistry:   { address: $mr },
     DatasetRegistry: { address: $ds },
     JobQueue:        { address: $jqc },
     AgentRegistry:   { address: $ar }
   }' >"$tmp"

mv "$tmp" "$STATE_FILE"

echo
echo "[system-deploy-v2] wrote state -> $STATE_FILE"
jq '. | {chainId, AdminGate, ModelRegistry, DatasetRegistry, JobQueue, AgentRegistry}' "$STATE_FILE"
