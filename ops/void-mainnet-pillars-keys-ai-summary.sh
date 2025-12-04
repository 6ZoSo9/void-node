#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$REPO_ROOT"

echo "=== [mainnet-pillars-keys-ai] VOID mainnet pillars+keys+AI+WC summary ==="
echo "[cfg] PROM_URL = $PROM_URL"
echo

query() {
  local expr="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --get --data-urlencode "query=${expr}"
}

extract_single_value() {
  jq -r '
    if .data.result | length == 0 then
      "NA"
    else
      .data.result[0].value[1]
    end
  '
}

echo "--- core pillars health (raw + 5m) ---"
raw_pillars=$(query 'void_mainnet_pillars_health'    | extract_single_value)
agg_pillars=$(query 'void:mainnet_pillars:health:last_5m' | extract_single_value)
echo "void_mainnet_pillars_health              = ${raw_pillars}"
echo "void:mainnet_pillars:health:last_5m      = ${agg_pillars}"

echo
echo "--- pillars+keys+AI composite (raw + 5m) ---"
raw_ai=$(query 'void_mainnet_pillars_with_keys_ai'              | extract_single_value)
agg_ai=$(query 'void:mainnet_pillars_with_keys_ai:health:last_5m' | extract_single_value)
echo "void_mainnet_pillars_with_keys_ai        = ${raw_ai}"
echo "void:mainnet_pillars_with_keys_ai:health:last_5m = ${agg_ai}"

echo
echo "--- work credits health (v3, 5m) ---"
wc_health=$(query 'void:work_credits:health_v3:last_5m' | extract_single_value)
echo "void:work_credits:health_v3:last_5m      = ${wc_health}"

echo
echo "--- work credits totals by agent ---"
query 'void:work_credits:total_by_agent' \
  | jq -r '
      if .data.result | length == 0 then
        "no agent totals"
      else
        .data.result[]
        | "agent=\(.metric.agent // "unknown") total=\(.value[1])"
      end
    '

echo
echo "--- work credits totals by pillar ---"
query 'void:work_credits:total_by_pillar' \
  | jq -r '
      if .data.result | length == 0 then
        "no pillar totals"
      else
        .data.result[]
        | "pillar=\(.metric.pillar // "unknown") total=\(.value[1])"
      end
    '

echo
echo "=== [mainnet-pillars-keys-ai] done ==="
