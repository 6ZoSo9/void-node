#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/dev/void-node"

echo "=== [plan-assert] VOID mainnet bootstrap PLAN assertion (textfile-based) ==="

echo
echo "[1] running PLAN exporter (dev rehearsal + textfile write)..."
./ops/void-mainnet-bootstrap-plan-health.sh

echo
echo "[2] reading current textfile collector metric (sudo)..."
TEXTFILE="/var/lib/node_exporter/textfile_collector/void_mainnet_bootstrap_plan.prom"
if ! sudo test -f "$TEXTFILE"; then
  echo "[plan-assert] FATAL: textfile $TEXTFILE not found" >&2
  exit 1
fi

echo "[plan-assert] contents of $TEXTFILE:"
sudo cat "$TEXTFILE"

echo
echo "[3] extracting void_mainnet_bootstrap_plan_health from textfile..."
LINE="$(sudo grep -E '^void_mainnet_bootstrap_plan_health ' "$TEXTFILE" || true)"

if [ -z "$LINE" ]; then
  echo "[plan-assert] ERROR: no void_mainnet_bootstrap_plan_health line found in textfile" >&2
  exit 1
fi

VALUE="${LINE##* }"
echo "[plan-assert] parsed value from textfile: $VALUE"

if [ "$VALUE" != "1" ]; then
  echo "[plan-assert] ERROR: expected value 1 in textfile, got $VALUE" >&2
  exit 1
fi

echo
echo "[plan-assert] RESULT: OK (dev PLAN + textfile metric both healthy)"

echo
echo "[4] optional: node_exporter /metrics view (for info only, NOT a gate)..."
curl -fsS http://127.0.0.1:9100/metrics \
  | grep -E '^void_mainnet_bootstrap_plan_(configured|health|health_info)' || true

echo
echo "[plan-assert] NOTE: /metrics values are informational only; gating uses the textfile."
