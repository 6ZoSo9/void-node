#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
LIVE_CFG="${LIVE_CFG:-config/void-mainnet-bootstrap-mainnet.live.json}"

cd "$REPO_ROOT"

echo "=== [day-of] VOID mainnet broadcast DAY-OF checklist ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo "[cfg] LIVE_CFG  = $LIVE_CFG"
echo "[cfg] PROM_URL  = $PROM_URL"
echo

echo "=== [0] git + branch sanity ==="
git rev-parse --abbrev-ref HEAD || true
git status --short || true
echo

echo "=== [1] PLAN readiness (Prometheus) ==="
./ops/void-mainnet-plan-ready-cli.sh
echo

echo "=== [2] mainnet-core + lastmile + safeboot + PLAN health ==="
./ops/void-mainnet-health-all.sh
echo

echo "=== [3] tokenomics health ==="
./ops/void-mainnet-tokenomics-health-all.sh
echo

echo "=== [4] LIVE CFG summary (roles + validator0) ==="
if command -v jq >/dev/null 2>&1; then
  echo "[live cfg] chainId:"
  jq '.chainId' "$LIVE_CFG" || true
  echo

  echo "[live cfg] roles:"
  jq '.roles' "$LIVE_CFG" || true
  echo

  echo "[live cfg] validator0:"
  jq '.validator0' "$LIVE_CFG" || true
else
  echo "[WARN] jq not found; showing raw LIVE CFG:"
  cat "$LIVE_CFG"
fi
echo

echo "=== [5] textfile PLAN metric (node_exporter truth) ==="
if [ -r /var/lib/node_exporter/textfile_collector/void_mainnet_bootstrap_plan.prom ]; then
  sed -n '1,120p' /var/lib/node_exporter/textfile_collector/void_mainnet_bootstrap_plan.prom
else
  echo "[WARN] textfile void_mainnet_bootstrap_plan.prom not readable"
fi
echo

echo "=== [6] Prometheus scalar double-checks (info) ==="
for q in \
  'void:mainnet_overall:health:last_5m_v2' \
  'void:mainnet_pillars:health:last_5m' \
  'void:mainnet_lastmile:health:last_5m' \
  'void_safeboot_overall_health' \
  'void_mainnet_bootstrap_plan_health' \
  'void:mainnet_bootstrap_plan:health:last_5m' \
  'void_mainnet_tokenomics_health'
do
  echo ">>> $q"
  curl -fsS "$PROM_URL/api/v1/query?query=$q" | jq '.data.result' || echo "[ERROR] query failed"
  echo
done

echo "=== [7] broadcast script state (should be DISABLED) ==="
if [ -x ops/void-mainnet-bootstrap-mainnet-broadcast.sh ]; then
  head -n 40 ops/void-mainnet-bootstrap-mainnet-broadcast.sh || true
else
  echo "[WARN] ops/void-mainnet-bootstrap-mainnet-broadcast.sh missing or not executable"
fi
echo

echo "=== [SUMMARY] ==="
echo "If everything above shows:"
echo "  - PLAN ready = 1"
echo "  - mainnet_overall / pillars / lastmile / safeboot / tokenomics = 1"
echo "  - PLAN textfile reason=\"ok\""
echo "  - LIVE CFG roles/validator0 look correct"
echo "  - broadcast script still shows the FATAL/disabled banner"
echo
echo "…then your environment is READY FOR A FUTURE MAINNET BROADCAST CEREMONY,"
echo "but this script itself DOES NOT broadcast anything."
echo
echo "[NOTE] To actually go live on a real 2050 mainnet RPC, we will create a"
echo "hardware-wallet-aware broadcast harness that replaces the FATAL guard."
echo "That will be a deliberate, separate step."
echo "=== [day-of checklist DONE] ==="
