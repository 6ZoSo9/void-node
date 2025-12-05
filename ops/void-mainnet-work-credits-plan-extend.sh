#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

CFG_DEV="config/void-mainnet-bootstrap-mainnet.dev.json"
CFG_LIVE="config/void-mainnet-bootstrap-mainnet.live.json"

echo "=== [wc-plan-extend] VOID mainnet Work Credits PLAN extension ==="

for CFG in "$CFG_DEV" "$CFG_LIVE"; do
  echo
  echo "=== [wc-plan-extend] processing $CFG ==="
  if [ ! -f "$CFG" ]; then
    echo "[warn] $CFG not found, skipping"
    continue
  fi

  # backup
  TS="$(date +%Y%m%d-%H%M%S)"
  cp "$CFG" "${CFG}.bak.wc-extend-${TS}"
  echo "[backup] wrote ${CFG}.bak.wc-extend-${TS}"

  TMP="$(mktemp)"

  jq '
    .contracts = (.contracts // {}) |
    .contracts.workCreditsToken        = (.contracts.workCreditsToken        // "0x0000000000000000000000000000000000000000") |
    .contracts.workCreditsMinter       = (.contracts.workCreditsMinter       // "0x0000000000000000000000000000000000000000") |
    .contracts.workCreditsRelayerHelper= (.contracts.workCreditsRelayerHelper// "0x0000000000000000000000000000000000000000")
  ' "$CFG" > "$TMP"

  mv "$TMP" "$CFG"

  echo "[after] contracts.workCredits* in $CFG:"
  jq -r '
    "  workCreditsToken         = \(.contracts.workCreditsToken)",
    "  workCreditsMinter        = \(.contracts.workCreditsMinter)",
    "  workCreditsRelayerHelper = \(.contracts.workCreditsRelayerHelper)"
  ' "$CFG"
done

echo
echo "=== [wc-plan-extend] PLAN sim smoke (expect stub revert but jq/JSON must be fine) ==="
./ops/void-mainnet-bootstrap-plan-sim.sh || echo "[info] PLAN sim non-zero (expected if stub revert-only)"

echo
echo "=== [wc-plan-extend] done ==="
