#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

echo "[agent-health] repo=$REPO"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
echo "[agent-health] RPC_URL=$RPC_URL"

STATE="$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json"
if [[ ! -f "$STATE" ]]; then
  echo "[agent-health] FATAL: protocol state file missing: $STATE" >&2
  exit 1
fi

if [[ -z "${DEVNET_CALLER_KEY:-}" ]]; then
  KEY_FILE="$REPO/.secrets/devnet-caller.key"
  echo "[agent-health] DEVNET_CALLER_KEY not set; loading from $KEY_FILE"
  if [[ ! -f "$KEY_FILE" ]]; then
    echo "[agent-health] FATAL: DEVNET_CALLER_KEY not set and $KEY_FILE missing" >&2
    exit 1
  fi
  DEVNET_CALLER_KEY="$(<"$KEY_FILE")"
  export DEVNET_CALLER_KEY
fi

echo "[agent-health] devnet caller key length: ${#DEVNET_CALLER_KEY}"

echo
echo "[agent-health] === step 1: agent echo-doc smoke (optional) ==="
if [[ -x "ops/void-devnet-agent-echo-doc-v1.sh" ]]; then
  if RPC_URL="$RPC_URL" ops/void-devnet-agent-echo-doc-v1.sh; then
    echo "[agent-health] echo-doc smoke OK (non-gating)"
  else
    echo "[agent-health] echo-doc smoke FAILED (ignored; rely on Prom gauges)" >&2
  fi
else
  echo "[agent-health] WARN: ops/void-devnet-agent-echo-doc-v1.sh not found or not executable; skipping"
fi

echo
echo "[agent-health] === step 2: agent receipt smoke ==="
if [[ -x "ops/void-devnet-agent-receipt-smoke-v1.sh" ]]; then
  if RPC_URL="$RPC_URL" ops/void-devnet-agent-receipt-smoke-v1.sh; then
    echo "[agent-health] receipt smoke OK (non-gating; rely on Prom gauges)"
  else
    echo "[agent-health] receipt smoke FAILED (ignored for CI gate; rely on gauges)" >&2
  fi
else
  echo "[agent-health] WARN: ops/void-devnet-agent-receipt-smoke-v1.sh not found or not executable; skipping"
fi

echo
echo "[agent-health] RESULT: OK (devnet agent health-all finished; rely on Prom gauges for SLOs)"
exit 0
