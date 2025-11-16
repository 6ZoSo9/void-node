#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
STATE="${STATE:-$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json}"
TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

# devnet defaults
ADMIN_DEFAULT="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
ADMIN="${ADMIN:-$ADMIN_DEFAULT}"

# 1) Resolve AgentRegistry from state
if [[ ! -f "$STATE" ]]; then
  health=0
  reason="no_state"
else
  AGENTREG="$(jq -r '.AgentRegistry.address // empty' "$STATE" || true)"
  if [[ -z "$AGENTREG" || "$AGENTREG" == "null" ]]; then
    health=0
    reason="no_agentregistry_in_state"
  else
    health=1
    reason="ok"
  fi
fi

# If we have an address, do some cheap on-chain checks
if [[ "${health:-0}" -eq 1 ]]; then
  # Sanity: admin() call
  admin_val="$(cast call "$AGENTREG" "admin()(address)" --rpc-url "$RPC_URL" 2>/dev/null || echo "")"
  if [[ -z "$admin_val" ]]; then
    health=0
    reason="admin_call_failed"
  elif [[ "$admin_val" != "$ADMIN" ]]; then
    health=0
    reason="admin_mismatch"
  fi
fi

# Optional: we treat the devnet admin as our first agent for health
if [[ "${health:-0}" -eq 1 ]]; then
  AGENT="${AGENT:-$ADMIN}"
  active_val="$(cast call "$AGENTREG" "isAgentActive(address)(bool)" "$AGENT" --rpc-url "$RPC_URL" 2>/dev/null || echo "")"
  if [[ -z "$active_val" ]]; then
    health=0
    reason="isAgentActive_call_failed"
  elif [[ "$active_val" != "true" ]]; then
    health=0
    reason="agent_not_active"
  fi
fi

mkdir -p "$TEXTFILE_DIR"

# temp file **inside** the textfile dir to avoid cross-filesystem mv weirdness
tmp="$(mktemp "$TEXTFILE_DIR/.void_agent_registry_devnet.prom.XXXXXX")"

cat >"$tmp" <<EOF
# HELP void_agent_registry_health_devnet overall AgentRegistry devnet health (1=ok, 0=bad)
# TYPE void_agent_registry_health_devnet gauge
void_agent_registry_health_devnet ${health:-0}
# HELP void_agent_registry_reason_devnet reason for current AgentRegistry devnet health (1 on the active reason)
# TYPE void_agent_registry_reason_devnet gauge
void_agent_registry_reason_devnet{reason="${reason:-unknown}"} 1
EOF

mv "$tmp" "$TEXTFILE_DIR/void_agent_registry_devnet.prom"

echo "[info] wrote $TEXTFILE_DIR/void_agent_registry_devnet.prom (health=${health:-0} reason=${reason:-unknown})"
