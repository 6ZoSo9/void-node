#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$REPO_ROOT"

echo "=== [mainnet-pillars-keys-ai-wc-relayers] VOID mainnet pillars+keys+AI+WC+relayers summary ==="
echo "[cfg] PROM_URL = $PROM_URL"
echo

q() {
  local label="$1"
  local query="$2"

  local value
  value="$(curl -fsS "$PROM_URL/api/v1/query?query=$query" 2>/dev/null \
    | jq -r '.data.result[0].value[1] // "NA"' 2>/dev/null || echo "ERR")"

  printf "%-55s = %s\n" "$label" "$value"
}

echo "--- core pillars + keys+AI (5m) ---"
q "void:mainnet_pillars:health:last_5m" \
  "void:mainnet_pillars:health:last_5m"
q "void:mainnet_pillars_with_keys_ai:health:last_5m" \
  "void:mainnet_pillars_with_keys_ai:health:last_5m"

echo
echo "--- work credits + relayers (5m) ---"
q "void:work_credits:health_v3:last_5m" \
  "void:work_credits:health_v3:last_5m"
q "void:relayers:health:last_5m" \
  "void:relayers:health:last_5m"

echo
echo "--- composite pillars+keys+AI+WC+relayers (5m) ---"
q "void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m" \
  "void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m"

echo
echo "=== [mainnet-pillars-keys-ai-wc-relayers] done ==="
