#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [ai-health-all] VOID AI readiness (aggregate) ==="

status=0

step() {
  local name="$1"
  shift
  echo
  echo "=== [$name] ==="
  if "$@"; then
    echo "[$name] OK"
  else
    rc=$?
    echo "[$name] FAILED (rc=$rc)"
    status=1
  fi
}

# 0) Mainnet planning & PLAN-only bootstrap sanity
if [ -x ./ops/void-mainnet-planning-health-all.sh ]; then
  step "planning-health-all" ./ops/void-mainnet-planning-health-all.sh
else
  echo "[planning-health-all] SKIP (script not present)"
fi

# 1) AI manifest (template + live JSON + Prom exporter)
if [ -x ./ops/void-ai-manifest-health-all.sh ]; then
  step "ai-manifest-health-all" ./ops/void-ai-manifest-health-all.sh
else
  echo "[ai-manifest-health-all] SKIP (script not present)"
fi

# 2) AI manifest HTTP discovery (well-known + internal route)
if [ -x /tmp/void-ai-manifest-http-health.sh ]; then
  step "ai-manifest-http-health" /tmp/void-ai-manifest-http-health.sh
elif [ -x ./ops/void-ai-manifest-http-health.sh ]; then
  step "ai-manifest-http-health" ./ops/void-ai-manifest-http-health.sh
else
  echo "[ai-manifest-http-health] SKIP (no HTTP health script found)"
fi

# 3) Agent receipts coverage (AI job receipts path)
if [ -x ./ops/void-agent-receipts-health.sh ]; then
  step "agent-receipts-health" ./ops/void-agent-receipts-health.sh
else
  echo "[agent-receipts-health] SKIP (script not present)"
fi

echo
echo "=== [ai-health-all] summary ==="
if [ "$status" -eq 0 ]; then
  echo "[summary] RESULT: OK (AI readiness pillar looks healthy)"
else
  echo "[summary] RESULT: FAILED (one or more AI checks failed)"
fi

exit "$status"
