#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STATE="docs/VOID-DEVNET-PROTOCOL-STATE.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
PRIV="${DEVNET_PRIVKEY:?set DEVNET_PRIVKEY to the devnet private key}"

if [ ! -f "$STATE" ]; then
  echo "[fix] ERROR: missing $STATE" >&2
  exit 1
fi

chainId=$(jq -r '.chainId // .chainID // ""' "$STATE")
deployer=$(jq -r '.deployer // ""' "$STATE")

echo "[fix] repo:      $ROOT"
echo "[fix] state:     $STATE"
echo "[fix] rpc:       $RPC_URL"
echo "[fix] chainId:   $chainId"
echo "[fix] deployer:  $deployer"
echo "[fix] masterKey: $deployer"

deploy_one() {
  local key="$1"
  local path="$2"
  shift 2
  local extra=( "$@" )

  local current code out addr

  # 1) If there is an existing address with bytecode, keep it
  current=$(jq -r ".$key // empty" "$STATE" || echo "")
  if [[ "$current" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
    code=$(cast code --rpc-url "$RPC_URL" "$current" 2>/dev/null || echo "0x")
    if [ "$code" != "0x" ]; then
      echo "[$key] keeping existing $current (code len ${#code})" >&2
      echo "$current"
      return 0
    fi
  fi

  # 2) Deploy a fresh instance (force broadcast + JSON output)
  echo "[$key] deploying via $path ..." >&2
  out=$(forge create "$path" \
          --rpc-url "$RPC_URL" \
          --private-key "$PRIV" \
          "${extra[@]}" \
          --broadcast \
          --json 2>&1) || {
    echo "[$key] forge create FAILED:" >&2
    printf '%s\n' "$out" >&2
    exit 1
  }

  # 3) Extract deployed address from JSON
  addr=$(printf '%s\n' "$out" | jq -r '.deployedTo // .deployed_to // empty')

  if ! [[ "$addr" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
    echo "[$key] ERROR: could not extract deployed address from forge JSON" >&2
    printf '%s\n' "$out" >&2
    exit 1
  fi

  echo "[$key] new address $addr" >&2
  echo "$addr"
}

# For devnet, feed the deployer/masterKey as the single constructor arg.
AGENT_ADDR=$(deploy_one AgentRegistry    'contracts/AgentRegistry.sol:AgentRegistry'       --constructor-args "$deployer")
DATASET_ADDR=$(deploy_one DatasetRegistry 'contracts/DatasetRegistry.sol:DatasetRegistry'  --constructor-args "$deployer")
MODEL_ADDR=$(deploy_one ModelRegistry     'contracts/ModelRegistry.sol:ModelRegistry'      --constructor-args "$deployer")
JOBQ_ADDR=$(deploy_one JobQueue           'contracts/JobQueue.sol:JobQueue'                --constructor-args "$deployer")

tmp="$STATE.tmp.$$"
jq \
  --arg agent   "$AGENT_ADDR" \
  --arg dataset "$DATASET_ADDR" \
  --arg model   "$MODEL_ADDR" \
  --arg jobq    "$JOBQ_ADDR" \
  '
    .AgentRegistry   = $agent   |
    .DatasetRegistry = $dataset |
    .ModelRegistry   = $model   |
    .JobQueue        = $jobq
  ' "$STATE" >"$tmp"

mv "$tmp" "$STATE"

echo "[fix] updated $STATE (registries):"
jq '.AgentRegistry, .DatasetRegistry, .ModelRegistry, .JobQueue' "$STATE"
