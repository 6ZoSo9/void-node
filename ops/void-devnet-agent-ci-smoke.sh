#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(pwd)}"
STATE="${STATE:-$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[agent-ci] repo=$REPO"
echo "[agent-ci] state=$STATE"
echo "[agent-ci] prom_url=$PROM_URL"

if [ ! -f "$STATE" ]; then
  echo "[agent-ci] ERROR: state file not found: $STATE" >&2
  exit 1
fi

AGENT_ADDR="$(jq -r '.AgentRegistry.address // ""' "$STATE")"

echo "[agent-ci] AgentRegistry.address=$AGENT_ADDR"

if ! [[ "$AGENT_ADDR" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  echo "[agent-ci] ERROR: AgentRegistry.address is missing or invalid" >&2
  exit 1
fi

# --- Helper: query a single scalar from Prometheus ---
prom_query() {
  local q="$1"
  curl -fsS "$PROM_URL/api/v1/query" --get --data-urlencode "query=$q" \
    | jq -r '
        if .status != "success" then
          empty
        elif (.data.result | length) == 0 then
          empty
        else
          .data.result[0].value[1]
        end
      '
}

echo
echo "[agent-ci] checking AgentRegistry health gauge (void_agentreg_devnet_health)..."
HEALTH="$(prom_query 'void_agentreg_devnet_health{chain="devnet"}')"

if [ -z "$HEALTH" ]; then
  echo "[agent-ci] ERROR: no series for void_agentreg_devnet_health{chain=\"devnet\"}" >&2
  exit 1
fi

echo "[agent-ci] void_agentreg_devnet_health{chain=\"devnet\"} = $HEALTH"

if [ "$HEALTH" != "1" ]; then
  echo "[agent-ci] ERROR: AgentRegistry health is not 1" >&2
  exit 1
fi

echo
echo "[agent-ci] checking AgentRegistry total-agents gauge (best-effort)..."
TOTAL_AGENTS="$(prom_query 'void_agentreg_devnet_total_agents{chain="devnet"}' || true)"

if [ -z "$TOTAL_AGENTS" ]; then
  echo "[agent-ci] NOTE: void_agentreg_devnet_total_agents not found; skipping total-agents assertion"
else
  echo "[agent-ci] void_agentreg_devnet_total_agents{chain=\"devnet\"} = $TOTAL_AGENTS"
  # Treat >0 as a nice-to-have; 0 is allowed but noisy.
  if awk "BEGIN { exit !($TOTAL_AGENTS < 1.0) }"; then
    echo "[agent-ci] WARN: AgentRegistry total_agents < 1 (no agents registered?)"
  else
    echo "[agent-ci] OK: AgentRegistry reports at least one agent"
  fi
fi

echo
echo "[agent-ci] RESULT: OK (AgentRegistry address sane + health gauge = 1)"
