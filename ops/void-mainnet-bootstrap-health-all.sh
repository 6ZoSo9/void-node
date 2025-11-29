#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [bootstrap-overall] VOID mainnet bootstrap overall health-all ==="
echo "[cfg] REPO_ROOT = $PWD"
echo "[cfg] PROM_URL  = $PROM_URL"
echo

echo "=== [1] mainnet pillars + Obelisk profile health-all ==="
if ./ops/void-mainnet-pillars-obelisk-health-all.sh; then
  echo "[bootstrap-overall] pillars+obelisk: OK"
else
  echo "[bootstrap-overall] pillars+obelisk: FAILED (see above for details)"
fi
echo

echo "=== [2] mainnet bootstrap PLAN pillar health-all ==="
if ./ops/void-mainnet-bootstrap-plan-health-all.sh; then
  echo "[bootstrap-overall] bootstrap PLAN pillar: OK (or informational)"
else
  echo "[bootstrap-overall] bootstrap PLAN pillar: FAILED (exporter or gauges broken)"
fi
echo

echo "=== [3] 5m smoothed scoreboard (Prometheus) ==="

echo "[qry] void:mainnet_pillars:health:last_5m"
curl -fsS "${PROM_URL}/api/v1/query?query=void:mainnet_pillars:health:last_5m" \
  | jq '.data.result' || true
echo

echo "[qry] void:obelisk_profile_health:last_5m"
curl -fsS "${PROM_URL}/api/v1/query?query=void:obelisk_profile_health:last_5m" \
  | jq '.data.result' || true
echo

echo "[qry] void:mainnet_bootstrap_plan:configured:last_5m"
curl -fsS "${PROM_URL}/api/v1/query?query=void:mainnet_bootstrap_plan:configured:last_5m" \
  | jq '.data.result' || true
echo

echo "[qry] void:mainnet_bootstrap_plan:health:last_5m"
curl -fsS "${PROM_URL}/api/v1/query?query=void:mainnet_bootstrap_plan:health:last_5m" \
  | jq '.data.result' || true
echo

echo "=== [4] interpretation (human) ==="
echo "  - void:mainnet_pillars:health:last_5m should be 1 when core/safeboot/devnet/keys are healthy."
echo "  - void:obelisk_profile_health:last_5m should be 1 when Obelisk profile + RPCs are healthy."
echo "  - void:mainnet_bootstrap_plan:configured:last_5m = 1 means a live bootstrap plan JSON is present."
echo "  - void:mainnet_bootstrap_plan:health:last_5m = 0 means PLAN is NOT ready yet (placeholders/zeros)."
echo
echo "=== [bootstrap-overall] done ==="
