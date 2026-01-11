#!/usr/bin/env bash
set -euo pipefail
PROM="${PROM:-http://127.0.0.1:9090}"

q() {
  curl -fsS --max-time 3 -G "$PROM/api/v1/query" \
    --data-urlencode "query=$1" \
  | jq -r '.data.result[0].value[1] // "[no result]"'
}

now="$(q 'max(void_datanet_mvp_roundtrip_ok_now)')"
last5="$(q 'void:datanet_mvp_roundtrip:ok:last_5m')"
comp="$(q 'void:mainnet_pillars_with_validators_and_datanet_mvp:health:last_5m')"

echo "datanet_ok_now=$now"
echo "datanet_ok_last5m=$last5"
echo "datanet_composite_last5m=$comp"

[[ "" == "1" ]] || { echo "[FAIL] datanet composite+receipts not OK"; exit 2; }
echo "[ok] datanet mvp pillar OK"

# --- receipts composite (added 2026-01-11) ---
r_comp="$(q 'void:mainnet_pillars_with_validators_and_datanet_mvp_and_receipts:health:last_5m')"
echo "datanet_receipts_composite_last5m=$r_comp"
