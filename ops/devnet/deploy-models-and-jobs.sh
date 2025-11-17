#!/usr/bin/env bash
set -euo pipefail

echo "[deploy] VOID devnet ModelRegistry + JobQueue"

# --- Config / env ---

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

STATE_FILE="$REPO_ROOT/docs/VOID-DEVNET-PROTOCOL-STATE.json"

RPC_URL="${RPC_URL:-}"
DEVNET_PRIVKEY="${DEVNET_PRIVKEY:-}"

if [[ -z "$RPC_URL" || -z "$DEVNET_PRIVKEY" ]]; then
  echo "[ERR] RPC_URL and DEVNET_PRIVKEY must be set in the environment" >&2
  exit 1
fi

if [[ ! -f "$STATE_FILE" ]]; then
  echo "[ERR] missing state file: $STATE_FILE" >&2
  exit 1
fi

# Try to recover an admin address from the state; fall back to deployer.
ADMIN_ADDR="$(jq -r '
  .AdminGateOwner // .ModelRegistryAdmin // .MasterKeyAdmin // .deployer // ""
' "$STATE_FILE")"

if [[ -z "$ADMIN_ADDR" || "$ADMIN_ADDR" == "null" ]]; then
  echo "[ERR] could not determine admin address from $STATE_FILE" >&2
  exit 1
fi

echo "[deploy] repo:       $REPO_ROOT"
echo "[deploy] state file: $STATE_FILE"
echo "[deploy] admin:      $ADMIN_ADDR"
echo "[deploy] RPC_URL:    $RPC_URL"

CHAIN_ID="$(cast chain-id --rpc-url "$RPC_URL")"
echo "[deploy] chainId:    $CHAIN_ID"

# --- Helper: deploy contract if state key is empty ---

deploy_if_missing() {
  local key="$1"
  local sol_file="$2"
  local contract_name="$3"
  local constructor_args=("${@:4}")

  local existing
  existing="$(jq -r --arg k "$key" '.[$k] // ""' "$STATE_FILE")"

  if [[ -n "$existing" && "$existing" != "null" ]]; then
    echo "[deploy] $key already set in state: $existing (skipping)"
    return 0
  fi

  echo "[deploy] deploying $contract_name from $sol_file ..."

  local out
  # forge create will print a line like "Deployed to: 0x..."
  out="$(forge create \
    --rpc-url "$RPC_URL" \
    --private-key "$DEVNET_PRIVKEY" \
    "$sol_file":"$contract_name" \
    --constructor-args "${constructor_args[@]}" \
  )"

  echo "$out"
  local addr
  addr="$(printf '%s\n' "$out" | sed -n 's/Deployed to: \([0-9xa-fA-F]\+\)/\1/p' | tail -n1)"

  if [[ -z "$addr" ]]; then
    echo "[ERR] failed to parse deployed address for $contract_name" >&2
    exit 1
  fi

  echo "[deploy] $contract_name deployed at: $addr"

  # Patch state file atomically
  tmp="$(mktemp "$STATE_FILE.tmp.XXXXXX")"
  jq --arg k "$key" --arg v "$addr" '.[$k] = $v' "$STATE_FILE" > "$tmp"
  mv "$tmp" "$STATE_FILE"

  echo "[deploy] updated $STATE_FILE with $key=$addr"
}

# --- Deploy ModelRegistry (if missing) ---

deploy_if_missing "ModelRegistry" "contracts/ModelRegistry.sol" "ModelRegistry" \
  "$ADMIN_ADDR"

# --- Deploy JobQueue (if missing) ---

deploy_if_missing "JobQueue" "contracts/JobQueue.sol" "JobQueue" \
  "$ADMIN_ADDR"

echo "[deploy] done. Current state fragment:"
jq '{chainId, deployer, AdminGate, ModelRegistry, JobQueue}' "$STATE_FILE" || true
