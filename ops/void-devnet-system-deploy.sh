#!/usr/bin/env bash
set -euo pipefail

REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO"

RPC_URL=${RPC_URL:-http://127.0.0.1:8545}
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
  if ! out=$(forge create "$artifact" \
        --rpc-url "$RPC_URL" \
        --private-key "$DEVNET_PRIVKEY" \
        --json \
        "$@" 2>&1); then
    echo "[system-deploy][ERR] forge create failed for $label:" >&2
    echo "$out" >&2
    exit 1
  fi

  echo "$out"

  # Expect JSON with a 'deployedTo' field.
  local addr
  addr=$(printf '%s\n' "$out" | jq -r '.deployedTo' 2>/dev/null || true)

  if [ -z "$addr" ] || [ "$addr" = "null" ]; then
    echo "[system-deploy][ERR] failed to parse deployed address for $label from JSON" >&2
    exit 1
  fi

  echo "[system-deploy] $label deployed at $addr"
  printf '%s\n' "$addr"
}

# Assumes constructor(address _adminGate) for all four; if wrong, forge will yell.
AGENT_REGISTRY=$(
  deploy_contract "AgentRegistry" "contracts/AgentRegistry.sol:AgentRegistry" \
    --constructor-args "$ADMIN_GATE"
)

DATASET_REGISTRY=$(
  deploy_contract "DatasetRegistry" "contracts/DatasetRegistry.sol:DatasetRegistry" \
    --constructor-args "$ADMIN_GATE"
)

MODEL_REGISTRY=$(
  deploy_contract "ModelRegistry" "contracts/ModelRegistry.sol:ModelRegistry" \
    --constructor-args "$ADMIN_GATE"
)

JOBQUEUE=$(
  deploy_contract "JobQueue" "contracts/JobQueue.sol:JobQueue" \
    --constructor-args "$ADMIN_GATE"
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
