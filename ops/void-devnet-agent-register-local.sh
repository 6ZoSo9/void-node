#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="docs/VOID-DEVNET-PROTOCOL-STATE.json"
MODEL_ID="${MODEL_ID:-devnet-test-model}"

echo "[agent-register] repo=$PWD"
echo "[agent-register] RPC_URL=$RPC_URL"
echo "[agent-register] STATE=$STATE"
echo "[agent-register] MODEL_ID=$MODEL_ID"
echo

if [ ! -f "$STATE" ]; then
  echo "[agent-register] FATAL: state file not found: $STATE" >&2
  exit 1
fi

AGENTREG_ADDR="$(jq -r '.AgentRegistry.address' "$STATE")"
if [ -z "$AGENTREG_ADDR" ] || [ "$AGENTREG_ADDR" = "null" ]; then
  echo "[agent-register] FATAL: AgentRegistry.address missing in state" >&2
  exit 1
fi

echo "[agent-register] AgentRegistry.address = $AGENTREG_ADDR"
echo

if [ -z "${DEVNET_CALLER_KEY:-}" ]; then
  echo "[agent-register] FATAL: DEVNET_CALLER_KEY not set (agent EOA key)" >&2
  exit 1
fi

if [ -z "${DEVNET_AGENT_ADMIN_KEY:-}" ]; then
  echo "[agent-register] FATAL: DEVNET_AGENT_ADMIN_KEY not set (AgentRegistry admin key)" >&2
  echo "[agent-register] HINT: export DEVNET_AGENT_ADMIN_KEY='0x...privatekey...'" >&2
  exit 1
fi

AGENT_ADDR="$(cast wallet address "$DEVNET_CALLER_KEY")"
ADMIN_ADDR_FROM_KEY="$(cast wallet address "$DEVNET_AGENT_ADMIN_KEY")"
ADMIN_ONCHAIN="$(cast call "$AGENTREG_ADDR" 'admin()(address)' --rpc-url "$RPC_URL")"

echo "=== [0] identities ==="
echo "[agent-register] AGENT_ADDR (from DEVNET_CALLER_KEY)       = $AGENT_ADDR"
echo "[agent-register] ADMIN_ADDR_FROM_KEY (DEVNET_AGENT_ADMIN)  = $ADMIN_ADDR_FROM_KEY"
echo "[agent-register] ADMIN_ONCHAIN (admin())                   = $ADMIN_ONCHAIN"
echo

if [ "$ADMIN_ADDR_FROM_KEY" != "$ADMIN_ONCHAIN" ]; then
  echo "[agent-register] FATAL: DEVNET_AGENT_ADMIN_KEY does not match on-chain admin()" >&2
  exit 1
fi

echo "=== [1] current auth state ==="
GLOBAL_BEFORE="$(cast call "$AGENTREG_ADDR" 'globalAgents(address)(bool)' "$AGENT_ADDR" --rpc-url "$RPC_URL")"
AUTH_BEFORE="$(cast call "$AGENTREG_ADDR" 'isAuthorized(address,string)(bool)' "$AGENT_ADDR" "$MODEL_ID" --rpc-url "$RPC_URL")"

echo "[agent-register] globalAgents[AGENT_ADDR] (before)       = $GLOBAL_BEFORE"
echo "[agent-register] isAuthorized(AGENT_ADDR, MODEL_ID) (before) = $AUTH_BEFORE"
echo

echo "=== [2] setAgentModel(AGENT_ADDR, MODEL_ID, true) ==="
echo "[agent-register] sending tx as ADMIN_ADDR=$ADMIN_ADDR_FROM_KEY"
cast send "$AGENTREG_ADDR" \
  "setAgentModel(address,string,bool)" \
  "$AGENT_ADDR" "$MODEL_ID" true \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_AGENT_ADMIN_KEY"
echo

echo "=== [3] auth state AFTER ==="
GLOBAL_AFTER="$(cast call "$AGENTREG_ADDR" 'globalAgents(address)(bool)' "$AGENT_ADDR" --rpc-url "$RPC_URL")"
AUTH_AFTER="$(cast call "$AGENTREG_ADDR" 'isAuthorized(address,string)(bool)' "$AGENT_ADDR" "$MODEL_ID" --rpc-url "$RPC_URL")"

echo "[agent-register] globalAgents[AGENT_ADDR] (after)        = $GLOBAL_AFTER"
echo "[agent-register] isAuthorized(AGENT_ADDR, MODEL_ID) (after)  = $AUTH_AFTER"
echo

if [ "$AUTH_AFTER" = "true" ]; then
  echo "[agent-register] RESULT: OK (AGENT_ADDR is now authorized for MODEL_ID)"
else
  echo "[agent-register] RESULT: WARN (AUTH_AFTER != true; something is off)" >&2
fi
