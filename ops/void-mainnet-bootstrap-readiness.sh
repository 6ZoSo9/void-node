#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [mainnet-bootstrap-readiness] VOID mainnet readiness snapshot ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo "[cfg] PROM_URL  = $PROM_URL"
echo

echo "=== [1] mainnet core/lastmile/safeboot pillars ==="
if [[ -x "./ops/void-mainnet-health-all.sh" ]]; then
  ./ops/void-mainnet-health-all.sh || true
else
  echo "[WARN] ./ops/void-mainnet-health-all.sh not found or not executable"
fi
echo

echo "=== [2] mainnet bootstrap PLAN health ==="
if [[ -x "./ops/void-mainnet-bootstrap-plan-all.sh" ]]; then
  ./ops/void-mainnet-bootstrap-plan-all.sh || true
else
  echo "[WARN] ./ops/void-mainnet-bootstrap-plan-all.sh not found or not executable"
fi
echo

echo "=== [3] docs presence (plan + keys) ==="
status=0
for f in \
  "ops/README-mainnet-bootstrap-plan-live.md" \
  "ops/README-mainnet-plan-roles-and-keys.md" \
  "ops/README-mainnet-keys-and-devices.md"
do
  if [[ -f "$f" ]]; then
    echo "[OK]   $f"
  else
    echo "[MISS] $f"
    status=1
  fi
done
echo

echo "=== [4] summary (Prometheus gating signals) ==="

q() {
  local expr="$1"
  echo ">>> $expr"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$expr" \
    | jq -r '.data.result[]? | "\(.metric) => \(.value[1])"' || echo "[no data]"
  echo
}

q 'void:mainnet_overall:health:last_5m_v2'
q 'void:mainnet_pillars:health:last_5m'
q 'void:mainnet_bootstrap_plan:configured:last_5m'
q 'void:mainnet_bootstrap_plan:health:last_5m'

echo "=== [mainnet-bootstrap-readiness] DONE ==="
exit $status
