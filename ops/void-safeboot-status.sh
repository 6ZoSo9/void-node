#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[safeboot-status] PROM_URL=${PROM_URL}"
echo

echo "=== [1] systemd state (void-node@safe-4100) ==="
systemctl --user is-enabled void-node@safe-4100.service 2>/dev/null || echo "  (not enabled)"
systemctl --user is-active  void-node@safe-4100.service 2>/dev/null || echo "  (not active)"
echo

echo "=== [2] Safeboot Prometheus gauges ==="

q() {
  local label="$1"
  local expr="$2"

  echo ">>> ${label}"
  curl -fsS "${PROM_URL}/api/v1/query?query=${expr}" \
    | jq -r '.data.result[]? | "\(.metric) => \(.value[1])"' || echo "  (no series)"
  echo
}

q "void_safeboot_overall_health" 'void_safeboot_overall_health'
q "void:safeboot:overall"        'void:safeboot:overall'
q "void_pillars_safeboot_ok"     'void_pillars_safeboot_ok'

echo "[safeboot-status] DONE"
