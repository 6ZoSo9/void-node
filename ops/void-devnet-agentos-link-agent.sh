#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

STATE_PROTO="docs/VOID-DEVNET-PROTOCOL-STATE.json"
STATE_AGENT="docs/VOID-DEVNET-AGENT-OS-STATE.json"

echo "[link-agent] repo:        $REPO"
echo "[link-agent] proto state: $STATE_PROTO"
echo "[link-agent] agent state: $STATE_AGENT"
echo "[link-agent] RPC_URL:     ${RPC_URL:-<unset>}"
echo "[link-agent] DEVNET_PRIVKEY: ${DEVNET_PRIVKEY:+<set>}"

if [ -z "${RPC_URL:-}" ] || [ -z "${DEVNET_PRIVKEY:-}" ]; then
  echo "[ERR] RPC_URL and DEVNET_PRIVKEY must be set in env"
  exit 1
fi

if [ ! -f "$STATE_PROTO" ] || [ ! -f "$STATE_AGENT" ]; then
  echo "[ERR] missing state json (need both protocol + agent OS)"
  exit 1
fi

CHAIN_ID=$(jq -r '.chainId' "$STATE_PROTO")
ADMIN_GATE=$(jq -r '.AdminGate' "$STATE_PROTO")
AGENT_REG=$(jq -r '.AgentRegistry // empty' "$STATE_AGENT")

echo "[link-agent] chainId:   $CHAIN_ID"
echo "[link-agent] AdminGate: $ADMIN_GATE"
echo "[link-agent] AgentRegistry (state): $AGENT_REG"

if [ -z "$ADMIN_GATE" ] || [ "$ADMIN_GATE" = "null" ]; then
  echo "[ERR] AdminGate missing in protocol state"
  exit 1
fi

if [ -z "$AGENT_REG" ] || [ "$AGENT_REG" = "null" ]; then
  echo "[ERR] AgentRegistry missing in agent OS state; deploy first"
  exit 1
fi

KEY_AGENT_REGISTRY=$(cast keccak "AGENT_REGISTRY")

echo "[link-agent] keys:"
echo "  AGENT_REGISTRY = $KEY_AGENT_REGISTRY"

echo "[link-agent] wiring AGENT_REGISTRY -> $AGENT_REG"

cast send "$ADMIN_GATE" \
  "setSystemContract(bytes32,address)" \
  "$KEY_AGENT_REGISTRY" "$AGENT_REG" \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY"

echo "[link-agent] done."
