#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="docs/VOID-DEVNET-PROTOCOL-STATE.json"
MODEL_ID="${MODEL_ID:-devnet-test-model}"

echo "[agent-auth-diag] repo=$PWD"
echo "[agent-auth-diag] RPC_URL=$RPC_URL"
echo "[agent-auth-diag] STATE=$STATE"
echo "[agent-auth-diag] MODEL_ID=$MODEL_ID"
echo

if [ ! -f "$STATE" ]; then
  echo "[agent-auth-diag] FATAL: state file not found: $STATE" >&2
  exit 1
fi

AGENTREG_ADDR="$(jq -r '.AgentRegistry.address' "$STATE")"
if [ -z "$AGENTREG_ADDR" ] || [ "$AGENTREG_ADDR" = "null" ]; then
  echo "[agent-auth-diag] FATAL: AgentRegistry.address missing in state" >&2
  exit 1
fi

echo "[agent-auth-diag] AgentRegistry.address = $AGENTREG_ADDR"
echo

echo "=== [0] on-chain admin ==="
ADMIN_ONCHAIN="$(cast call "$AGENTREG_ADDR" 'admin()(address)' --rpc-url "$RPC_URL")"
echo "[agent-auth-diag] admin()           = $ADMIN_ONCHAIN"
echo

if [ -z "${DEVNET_CALLER_KEY:-}" ]; then
  echo "[agent-auth-diag] NOTE: DEVNET_CALLER_KEY not set; skipping caller/agent checks" >&2
  exit 0
fi

CALLER_ADDR="$(cast wallet address "$DEVNET_CALLER_KEY")"
echo "=== [1] caller / agent address ==="
echo "[agent-auth-diag] CALLER_ADDR       = $CALLER_ADDR"
echo

echo "=== [2] globalAgents / isAuthorized ==="
GLOBAL_FLAG="$(cast call "$AGENTREG_ADDR" 'globalAgents(address)(bool)' "$CALLER_ADDR" --rpc-url "$RPC_URL")"
AUTHORIZED="$(cast call "$AGENTREG_ADDR" 'isAuthorized(address,string)(bool)' "$CALLER_ADDR" "$MODEL_ID" --rpc-url "$RPC_URL")"

echo "[agent-auth-diag] globalAgents[CALLER] = $GLOBAL_FLAG"
echo "[agent-auth-diag] isAuthorized(CALLER, MODEL_ID) = $AUTHORIZED"
echo

echo "[agent-auth-diag] SUMMARY:"
echo "  admin()                    = $ADMIN_ONCHAIN"
echo "  CALLER_ADDR                = $CALLER_ADDR"
echo "  globalAgents[CALLER]       = $GLOBAL_FLAG"
echo "  isAuthorized(CALLER,MODEL) = $AUTHORIZED"
