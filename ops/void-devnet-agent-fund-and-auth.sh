#!/usr/bin/env bash
set -euo pipefail
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"

need(){ command -v "$1" >/dev/null 2>&1 || { echo "[ERR] missing: $1"; exit 2; }; }
need jq; need cast

ADMIN_PRIVKEY="${ADMIN_PRIVKEY:-}"
AGENT_PRIVKEY="${AGENT_PRIVKEY:-}"

key_ok(){ [[ "$1" =~ ^0x[0-9a-fA-F]{64}$ ]]; }

if ! key_ok "$ADMIN_PRIVKEY"; then
  echo "[ERR] ADMIN_PRIVKEY must be 0x + 64 hex chars (NO ellipsis)."
  echo "      got: ${ADMIN_PRIVKEY:0:14}... (len=${#ADMIN_PRIVKEY})"
  exit 2
fi
if ! key_ok "$AGENT_PRIVKEY"; then
  echo "[ERR] AGENT_PRIVKEY must be 0x + 64 hex chars (NO ellipsis)."
  echo "      got: ${AGENT_PRIVKEY:0:14}... (len=${#AGENT_PRIVKEY})"
  exit 2
fi

AGENTR="$(jq -r '(.AgentRegistry | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")"
[[ "$AGENTR" =~ ^0x[0-9a-fA-F]{40}$ ]] || { echo "[ERR] bad AGENTR='$AGENTR'"; exit 2; }

ADMIN_ADDR="$(cast wallet address --private-key "$ADMIN_PRIVKEY")"
AGENT_ADDR="$(cast wallet address --private-key "$AGENT_PRIVKEY")"

echo "[cfg] rpc=$RPC_URL"
echo "[cfg] agentRegistry=$AGENTR"
echo "[cfg] admin=$ADMIN_ADDR"
echo "[cfg] agent=$AGENT_ADDR"

BAL="$(cast balance "$AGENT_ADDR" --rpc-url "$RPC_URL")"
echo "[cfg] agent_balance_wei=$BAL"

if [[ "$BAL" == "0" ]]; then
  echo "[do] funding agent with 10 ETH"
  cast send "$AGENT_ADDR" --value 10ether --private-key "$ADMIN_PRIVKEY" --rpc-url "$RPC_URL" >/dev/null
  BAL2="$(cast balance "$AGENT_ADDR" --rpc-url "$RPC_URL")"
  echo "[ok] agent_balance_wei=$BAL2"
else
  echo "[ok] agent already funded"
fi

echo "[do] setAgentGlobal(agent,true)"
cast send "$AGENTR" 'setAgentGlobal(address,bool)' "$AGENT_ADDR" true   --private-key "$ADMIN_PRIVKEY" --rpc-url "$RPC_URL" >/dev/null
echo "[ok] agent globally authorized"
