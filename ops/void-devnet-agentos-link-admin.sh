#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

STATE_PROTOCOL="docs/VOID-DEVNET-PROTOCOL-STATE.json"
STATE_AGENTOS="docs/VOID-DEVNET-AGENT-OS-STATE.json"

: "${RPC_URL:?RPC_URL must be set (e.g. http://127.0.0.1:8545)}"
: "${DEVNET_PRIVKEY:?DEVNET_PRIVKEY must be set (devnet deployer key)}"

if [[ ! -f "$STATE_PROTOCOL" ]]; then
  echo "[ERR] missing $STATE_PROTOCOL" >&2
  exit 1
fi

if [[ ! -f "$STATE_AGENTOS" ]]; then
  echo "[ERR] missing $STATE_AGENTOS" >&2
  exit 1
fi

CHAIN_PROTO=$(jq -r '.chainId' "$STATE_PROTOCOL")
CHAIN_AGENTOS=$(jq -r '.chainId' "$STATE_AGENTOS")

if [[ "$CHAIN_PROTO" != "2050" || "$CHAIN_AGENTOS" != "2050" ]]; then
  echo "[ERR] unexpected chainIds: protocol=$CHAIN_PROTO agentos=$CHAIN_AGENTOS (want 2050)" >&2
  exit 1
fi

ADMINGATE=$(jq -r '.AdminGate' "$STATE_PROTOCOL")
if [[ -z "$ADMINGATE" || "$ADMINGATE" == "null" ]]; then
  echo "[ERR] AdminGate missing in $STATE_PROTOCOL" >&2
  exit 1
fi

MR_ADDR=$(jq -r '.ModelRegistry' "$STATE_AGENTOS")
JQ_ADDR=$(jq -r '.JobQueue' "$STATE_AGENTOS")
ME_ADDR=$(jq -r '.ModelEvalRegistry' "$STATE_AGENTOS")

if [[ -z "$MR_ADDR" || "$MR_ADDR" == "null" ]]; then
  echo "[ERR] ModelRegistry missing in $STATE_AGENTOS" >&2
  exit 1
fi
if [[ -z "$JQ_ADDR" || "$JQ_ADDR" == "null" ]]; then
  echo "[ERR] JobQueue missing in $STATE_AGENTOS" >&2
  exit 1
fi
if [[ -z "$ME_ADDR" || "$ME_ADDR" == "null" ]]; then
  echo "[ERR] ModelEvalRegistry missing in $STATE_AGENTOS" >&2
  exit 1
fi

echo "[link-admin] repo:        $REPO"
echo "[link-admin] chainId:     $CHAIN_PROTO"
echo "[link-admin] AdminGate:   $ADMINGATE"
echo "[link-admin] ModelRegistry:      $MR_ADDR"
echo "[link-admin] JobQueue:           $JQ_ADDR"
echo "[link-admin] ModelEvalRegistry:  $ME_ADDR"

KEY_MODEL_REGISTRY=$(cast keccak "MODEL_REGISTRY")
KEY_JOB_QUEUE=$(cast keccak "JOB_QUEUE")
KEY_MODEL_EVAL=$(cast keccak "MODEL_EVAL_REGISTRY")
KEY_AGENT_REGISTRY=$(cast keccak "AGENT_REGISTRY")
KEY_JOB_RECEIPTS=$(cast keccak "JOB_RECEIPTS")

echo "[link-admin] keys:"
echo "  MODEL_REGISTRY       = $KEY_MODEL_REGISTRY"
echo "  JOB_QUEUE            = $KEY_JOB_QUEUE"
echo "  MODEL_EVAL_REGISTRY  = $KEY_MODEL_EVAL"
echo "  AGENT_REGISTRY       = $KEY_AGENT_REGISTRY"
echo "  JOB_RECEIPTS         = $KEY_JOB_RECEIPTS"

echo
echo "[link-admin] wiring MODEL_REGISTRY -> $MR_ADDR"
cast send "$ADMINGATE" \
  "setSystemContract(bytes32,address)" \
  "$KEY_MODEL_REGISTRY" "$MR_ADDR" \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY"

echo
echo "[link-admin] wiring JOB_QUEUE -> $JQ_ADDR"
cast send "$ADMINGATE" \
  "setSystemContract(bytes32,address)" \
  "$KEY_JOB_QUEUE" "$JQ_ADDR" \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY"

echo
echo "[link-admin] wiring MODEL_EVAL_REGISTRY -> $ME_ADDR"
cast send "$ADMINGATE" \
  "setSystemContract(bytes32,address)" \
  "$KEY_MODEL_EVAL" "$ME_ADDR" \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY"

# AgentRegistry + JobReceipts will be wired once those addresses
# are present in the protocol / agent OS state (future step).
echo
echo "[link-admin] NOTE: AGENT_REGISTRY and JOB_RECEIPTS keys are reserved."
echo "[link-admin]       Wire them once their addresses are recorded in state JSON."

echo
echo "[link-admin] done."
