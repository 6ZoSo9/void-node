#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

STATE_PROTO="docs/VOID-DEVNET-PROTOCOL-STATE.json"
STATE_AGENT="docs/VOID-DEVNET-AGENT-OS-STATE.json"

echo "[agentreg-health] repo:        $REPO"
echo "[agentreg-health] proto state: $STATE_PROTO"
echo "[agentreg-health] agent state: $STATE_AGENT"
echo "[agentreg-health] RPC_URL:     ${RPC_URL:-<unset>}"

if [ -z "${RPC_URL:-}" ]; then
  echo "[ERR] RPC_URL must be set in env"
  exit 1
fi

if [ ! -f "$STATE_PROTO" ] || [ ! -f "$STATE_AGENT" ]; then
  echo "[ERR] missing state json (need both protocol + agent OS)"
  exit 1
fi

ADMIN_GATE=$(jq -r '.AdminGate' "$STATE_PROTO")
AGENT_REG=$(jq -r '.AgentRegistry // empty' "$STATE_AGENT")

echo "[agentreg-health] AdminGate:     $ADMIN_GATE"
echo "[agentreg-health] AgentRegistry: $AGENT_REG"

if [ -z "$ADMIN_GATE" ] || [ "$ADMIN_GATE" = "null" ]; then
  echo "[ERR] AdminGate missing in protocol state"
  exit 1
fi

if [ -z "$AGENT_REG" ] || [ "$AGENT_REG" = "null" ]; then
  echo "[ERR] AgentRegistry missing in agent OS state"
  exit 1
fi

# 1) Check admin() matches AdminGate
ONCHAIN_ADMIN=$(cast call "$AGENT_REG" 'admin()(address)' --rpc-url "$RPC_URL")
echo "[agentreg-health] on-chain admin: $ONCHAIN_ADMIN"

if [ "${ONCHAIN_ADMIN,,}" != "${ADMIN_GATE,,}" ]; then
  echo "[ERR] admin mismatch (on-chain != protocol AdminGate)"
  exit 1
fi

# 2) Sanity ping: isRegistered on a dummy ID (should be false, but must not revert)
DUMMY_ID="void-agent/HEALTHCHECK_DUMMY"
REGISTERED=$(cast call "$AGENT_REG" 'isRegistered(string)(bool)' "$DUMMY_ID" --rpc-url "$RPC_URL")
echo "[agentreg-health] isRegistered('$DUMMY_ID') = $REGISTERED"

echo "[agentreg-health] OK."
