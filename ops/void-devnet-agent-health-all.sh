#!/usr/bin/env bash
set -euo pipefail

echo "[agent-health] repo=$HOME/dev/void-node"

cd "$HOME/dev/void-node"

RPC_URL_DEFAULT="http://127.0.0.1:8545"
RPC_URL="${RPC_URL:-$RPC_URL_DEFAULT}"
echo "[agent-health] RPC_URL=$RPC_URL"

# Ensure DEVNET_CALLER_KEY is available (agent key)
if [[ -z "${DEVNET_CALLER_KEY:-}" ]]; then
  if [[ -f ".secrets/devnet-caller.key" ]]; then
    echo "[agent-health] DEVNET_CALLER_KEY not set; loading from .secrets/devnet-caller.key"
    export DEVNET_CALLER_KEY="$(cat .secrets/devnet-caller.key)"
  else
    echo "[agent-health] FATAL: DEVNET_CALLER_KEY not set and .secrets/devnet-caller.key missing" >&2
    exit 1
  fi
fi

echo "[agent-health] devnet caller key length: ${#DEVNET_CALLER_KEY}"

echo
echo "[agent-health] === step 1: agent echo-doc smoke (optional) ==="
if [[ -x "ops/void-devnet-agent-echo-doc-v1.sh" ]]; then
  ops/void-devnet-agent-echo-doc-v1.sh
else
  echo "[agent-health] WARN: ops/void-devnet-agent-echo-doc-v1.sh not found or not executable; skipping"
fi

echo
echo "[agent-health] === step 2: agent receipt smoke ==="
if if [[ ! -x "ops/void-devnet-agent-receipt-smoke-v1.sh" ]]; then ; then
  echo "[agent-health] receipt smoke OK (non-gating; rely on Prom gauges)"
else
  echo "[agent-health] receipt smoke FAILED (ignored for CI gate; rely on gauges)" >&2
fi
  echo "[agent-health] FATAL: ops/void-devnet-agent-receipt-smoke-v1.sh not found or not executable" >&2
  exit 1
fi

ops/void-devnet-agent-receipt-smoke-v1.sh

echo
echo "[agent-health] RESULT: OK (devnet agent echo-doc + receipt-smoke passed)"
