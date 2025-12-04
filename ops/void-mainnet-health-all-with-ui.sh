#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [run] mainnet health-all (core stack) ==="
if ./ops/void-mainnet-health-all.sh; then
  core_status="OK"
else
  core_status="BAD"
fi

echo
echo "=== [run] ui-pillars-health-all (WC + Dashboard) ==="
if ./ops/void-mainnet-ui-pillars-health-all.sh; then
  ui_status="OK"
else
  ui_status="BAD"
fi

echo
echo "=== [summary] VOID mainnet + UI pillars ==="
echo "  core stack (pillars without UI): ${core_status}"
echo "  ui pillars (WC + dashboard)     : ${ui_status}"

overall="BAD"
if [ "$core_status" = "OK" ] && [ "$ui_status" = "OK" ]; then
  overall="OK"
fi

echo
echo "[mainnet-health-all-with-ui] RESULT: ${overall}"
