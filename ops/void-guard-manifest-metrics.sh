#!/usr/bin/env bash
set -euo pipefail
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
q() { curl -fsS --max-time 4 -G "$PROM_URL/api/v1/query" --data-urlencode "query=$1" | jq -r '.data.result[0].value[1] // "NaN"'; }
D="$(q 'max(void_mainnet_core_manifest_days)')"
H="$(q 'max(void_mainnet_core_manifest_health)')"
if [[ "$D" == "NaN" || "$H" == "NaN" ]]; then
  echo "[FAIL] manifest metrics missing in Prom (days=$D health=$H)"
  exit 2
fi
echo "[OK] manifest metrics present (days=$D health=$H)"
