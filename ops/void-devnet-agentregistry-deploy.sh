#!/usr/bin/env bash
set -euo pipefail

# Always run from repo root
cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

PROTO_STATE="$REPO_ROOT/docs/VOID-DEVNET-PROTOCOL-STATE.json"
AGENT_STATE="$REPO_ROOT/docs/VOID-DEVNET-AGENT-OS-STATE.json"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

if [ -z "${DEVNET_PRIVKEY:-}" ]; then
  echo "[agentregistry-deploy] ERROR: DEVNET_PRIVKEY not set" >&2
  exit 1
fi

ADMIN_GATE=$(jq -r '.AdminGate' "$PROTO_STATE")
if [ -z "$ADMIN_GATE" ] || [ "$ADMIN_GATE" = "null" ]; then
  echo "[agentregistry-deploy] ERROR: missing AdminGate in $PROTO_STATE" >&2
  exit 1
fi

echo "[agentregistry-deploy] repo:        $REPO_ROOT"
echo "[agentregistry-deploy] proto state: $PROTO_STATE"
echo "[agentregistry-deploy] agent state: $AGENT_STATE"
echo "[agentregistry-deploy] RPC_URL:     $RPC_URL"
echo "[agentregistry-deploy] DEVNET_PRIVKEY: <set>"
echo "[agentregistry-deploy] AdminGate:   $ADMIN_GATE"

# Real deployment, NOT a dry run
LOG=/tmp/agentregistry-create.log
rm -f "$LOG"

forge create contracts/AgentRegistry.sol:AgentRegistry \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_PRIVKEY" \
  --constructor-args "$ADMIN_GATE" \
  --broadcast \
  | tee "$LOG"

# Parse "Deployed to: 0x..." from forge output
ADDR=$(grep -Eo 'Deployed to: 0x[0-9a-fA-F]{40}' "$LOG" | awk '{print $3}' | tail -1)

if [ -z "$ADDR" ]; then
  echo "[agentregistry-deploy] ERROR: could not parse deployed address from forge output" >&2
  exit 1
fi

echo "[agentregistry-deploy] AgentRegistry deployed at: $ADDR"

# Sanity check: there MUST be code at the address
CODE=$(cast code "$ADDR" --rpc-url "$RPC_URL")
if [ "$CODE" = "0x" ]; then
  echo "[agentregistry-deploy] ERROR: no code at $ADDR even after broadcast" >&2
  exit 1
fi

# Update Agent OS state JSON
TMP=$(mktemp)
jq --arg addr "$ADDR" '.AgentRegistry = $addr' "$AGENT_STATE" > "$TMP"
mv "$TMP" "$AGENT_STATE"

echo "[agentregistry-deploy] updated $AGENT_STATE"
