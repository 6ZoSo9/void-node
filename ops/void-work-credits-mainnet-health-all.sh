#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
CFG_PATH="${CFG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"

cd "$REPO_ROOT"

echo "=== [wc-mainnet-health-all] VOID WC mainnet plan + health summary ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo "[cfg] PROM_URL  = $PROM_URL"
echo "[cfg] CFG_PATH  = $CFG_PATH"
echo

echo "--- [1] core mainnet planning pillars ---"
./ops/void-mainnet-planning-health-all.sh || echo "[warn] planning-health-all reported non-zero exit status"
echo

echo "--- [2] WC + relayers health ---"
./ops/void-work-credits-health-all.sh || echo "[warn] work-credits-health-all reported non-zero exit status"
echo

echo "--- [3] composite pillars+keys+AI+WC+relayers (5m) ---"
curl -fsS "$PROM_URL/api/v1/query?query=void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m" \
  | jq '.data.result'
echo

echo "--- [4] WC roles + 10M VOID split (PLAN only) ---"
./ops/void-work-credits-mainnet-plan-sim.sh || echo "[warn] wc-mainnet-plan-sim failed"
echo

echo "=== [wc-mainnet-health-all] done ==="
