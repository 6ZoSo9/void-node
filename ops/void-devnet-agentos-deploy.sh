#!/usr/bin/env bash
set -euo pipefail

echo "[agentos-deploy] starting Agent OS v1 deploy"

# --- Env / tooling checks ---

: "${RPC_URL:?RPC_URL env var is required, e.g. http://127.0.0.1:8545}"
: "${DEVNET_PRIVKEY:?DEVNET_PRIVKEY env var is required}"

if ! command -v forge >/dev/null 2>&1; then
  echo "[agentos-deploy] ERROR: forge not found in PATH" >&2
  exit 1
fi

if ! command -v cast >/dev/null 2>&1; then
  echo "[agentos-deploy] ERROR: cast not found in PATH" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[agentos-deploy] ERROR: jq not found in PATH" >&2
  exit 1
fi

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

STATE_FILE="$REPO/docs/VOID-DEVNET-AGENT-OS-STATE.json"

echo "[agentos-deploy] repo:       $REPO"
echo "[agentos-deploy] RPC_URL:    $RPC_URL"
echo "[agentos-deploy] STATE_FILE: $STATE_FILE"

# --- Basic chain sanity ---

CHAIN_ID="$(cast chain-id --rpc-url "$RPC_URL")" || {
  echo "[agentos-deploy] ERROR: failed to read chain id from RPC_URL" >&2
  exit 1
}

DEPLOYER="$(cast wallet address --private-key "$DEVNET_PRIVKEY")" || {
  echo "[agentos-deploy] ERROR: failed to derive deployer address from DEVNET_PRIVKEY" >&2
  exit 1
}

echo "[agentos-deploy] chainId     = $CHAIN_ID"
echo "[agentos-deploy] deployer    = $DEPLOYER"

# --- Deploy ModelRegistry ---

echo "[agentos-deploy] deploying ModelRegistry..."
MR_OUT="$(forge create contracts/ModelRegistry.sol:ModelRegistry \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  --broadcast \
  --via-ir \
  --constructor-args "$DEPLOYER")"

echo "$MR_OUT"
MODEL_REGISTRY_ADDR="$(printf '%s\n' "$MR_OUT" | awk '/Deployed to:/ {print $3}' | tail -n1)"

if [ -z "$MODEL_REGISTRY_ADDR" ]; then
  echo "[agentos-deploy] ERROR: could not parse ModelRegistry address" >&2
  exit 1
fi

echo "[agentos-deploy] ModelRegistry = $MODEL_REGISTRY_ADDR"

# --- Deploy JobQueue ---

echo "[agentos-deploy] deploying JobQueue..."
JQ_OUT="$(forge create contracts/JobQueue.sol:JobQueue \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  --broadcast \
  --via-ir \
  --constructor-args "$DEPLOYER")"

echo "$JQ_OUT"
JOB_QUEUE_ADDR="$(printf '%s\n' "$JQ_OUT" | awk '/Deployed to:/ {print $3}' | tail -n1)"

if [ -z "$JOB_QUEUE_ADDR" ]; then
  echo "[agentos-deploy] ERROR: could not parse JobQueue address" >&2
  exit 1
fi

echo "[agentos-deploy] JobQueue     = $JOB_QUEUE_ADDR"

# --- Deploy ModelEvalRegistry ---

echo "[agentos-deploy] deploying ModelEvalRegistry..."
ME_OUT="$(forge create contracts/ModelEvalRegistry.sol:ModelEvalRegistry \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  --broadcast \
  --via-ir \
  --constructor-args "$DEPLOYER")"

echo "$ME_OUT"
MODEL_EVAL_ADDR="$(printf '%s\n' "$ME_OUT" | awk '/Deployed to:/ {print $3}' | tail -n1)"

if [ -z "$MODEL_EVAL_ADDR" ]; then
  echo "[agentos-deploy] ERROR: could not parse ModelEvalRegistry address" >&2
  exit 1
fi

echo "[agentos-deploy] ModelEvalRegistry = $MODEL_EVAL_ADDR"

# --- Write state JSON ---

TMP="$(mktemp)"

cat > "$TMP" <<EOF
{
  "chainId": $CHAIN_ID,
  "deployer": "$DEPLOYER",
  "ModelRegistry": "$MODEL_REGISTRY_ADDR",
  "JobQueue": "$JOB_QUEUE_ADDR",
  "ModelEvalRegistry": "$MODEL_EVAL_ADDR"
}
EOF

mv "$TMP" "$STATE_FILE"

echo "[agentos-deploy] wrote state to $STATE_FILE"
echo "[agentos-deploy] Agent OS v1 deploy complete."
