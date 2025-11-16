#!/usr/bin/env bash
set -euo pipefail

REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_JSON="$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json"

echo "[system-deploy] repo:    $REPO"
echo "[system-deploy] RPC_URL: $RPC_URL"
echo "[system-deploy] STATE:   $STATE_JSON"

if [ ! -f "$STATE_JSON" ]; then
  echo "[system-deploy][ERR] protocol state json not found: $STATE_JSON" >&2
  exit 1
fi

if [ -z "${DEVNET_PRIVKEY:-}" ]; then
  echo "[system-deploy][ERR] DEVNET_PRIVKEY not set (dev-only Anvil key)" >&2
  exit 1
fi

CHAIN_ID=$(jq -r '.chainId' "$STATE_JSON")
DEPLOYER=$(jq -r '.deployer' "$STATE_JSON")
ADMIN_GATE=$(jq -r '.AdminGate' "$STATE_JSON")

echo "[system-deploy] chainId(json) = $CHAIN_ID"
echo "[system-deploy] deployer      = $DEPLOYER"
echo "[system-deploy] AdminGate     = $ADMIN_GATE"

if [ -z "$ADMIN_GATE" ] || [ "$ADMIN_GATE" = "null" ]; then
  echo "[system-deploy][ERR] AdminGate missing in protocol state json" >&2
  exit 1
fi

deploy_contract() {
  local label="$1"
  local artifact="$2"
  shift 2

  echo "[system-deploy] deploying $label ($artifact)…"

  local out
  if [ "$#" -gt 0 ]; then
    # With constructor args (e.g. AdminGate address)
    if ! out=$(forge create "$artifact" \
          --rpc-url "$RPC_URL" \
          --private-key "$DEVNET_PRIVKEY" \
          --constructor-args "$@" 2>&1); then
      echo "[system-deploy][ERR] forge create failed for $label:" >&2
      printf '%s\n' "$out" >&2
      exit 1
    fi
  else
    # No constructor args
    if ! out=$(forge create "$artifact" \
          --rpc-url "$RPC_URL" \
          --private-key "$DEVNET_PRIVKEY" 2>&1); then
      echo "[system-deploy][ERR] forge create failed for $label:" >&2
      printf '%s\n' "$out" >&2
      exit 1
    fi
  fi

  # Echo raw forge output so we can see what's going on
  printf '%s\n' "$out"

  # Strip ANSI + CR, then grab the last 0x + 40 hex chars (contract addr)
  local addr
  addr=$(printf '%s\n' "$out" \
    | sed -r 's/\x1B\[[0-9;]*[mK]//g' \
    | tr -d '\r' \
    | grep -Eo '0x[0-9a-fA-F]{40}' \
    | tail -n 1)

  if [ -z "$addr" ]; then
    echo "[system-deploy][ERR] failed to parse deployed address for $label from forge output" >&2
    exit 1
  fi

  echo "[system-deploy] $label deployed at $addr"
  printf '%s\n' "$addr"
}

# All four take constructor(address _adminGate)
AGENT_REGISTRY=$(
  deploy_contract "AgentRegistry" "contracts/AgentRegistry.sol:AgentRegistry" \
    "$ADMIN_GATE"
)

DATASET_REGISTRY=$(
  deploy_contract "DatasetRegistry" "contracts/DatasetRegistry.sol:DatasetRegistry" \
    "$ADMIN_GATE"
)

MODEL_REGISTRY=$(
  deploy_contract "ModelRegistry" "contracts/ModelRegistry.sol:ModelRegistry" \
    "$ADMIN_GATE"
)

JOBQUEUE=$(
  deploy_contract "JobQueue" "contracts/JobQueue.sol:JobQueue" \
    "$ADMIN_GATE"
)

echo "[system-deploy] updating protocol state json with system contract addresses…"

TMP=$(mktemp)
jq \
  --arg agent   "$AGENT_REGISTRY" \
  --arg dataset "$DATASET_REGISTRY" \
  --arg model   "$MODEL_REGISTRY" \
  --arg job     "$JOBQUEUE" \
  '
    .AgentRegistry   = $agent
  | .DatasetRegistry = $dataset
  | .ModelRegistry   = $model
  | .JobQueue        = $job
  ' "$STATE_JSON" > "$TMP"

mv "$TMP" "$STATE_JSON"

echo "[system-deploy] updated $STATE_JSON:"
cat "$STATE_JSON"

echo "[system-deploy] DONE."
