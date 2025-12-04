#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$REPO_ROOT"

echo "=== [work-credits-health-all] VOID WC + relayers + pillars composite health ==="
echo "[cfg] PROM_URL = $PROM_URL"
echo

q() {
  local label="$1"
  local query="$2"

  local raw
  raw="$(curl -fsS "$PROM_URL/api/v1/query?query=$query" 2>/dev/null \
    | jq -r '.data.result[0].value[1] // "NA"' 2>/dev/null || echo "ERR")"

  printf "%-65s = %s\n" "$label" "$raw"
  echo "$raw"
}

# 1) core pieces
echo "--- component health (5m) ---"
h_pillars="$(q "void:mainnet_pillars:health:last_5m" \
  "void:mainnet_pillars:health:last_5m" | tail -n1)"
h_keys_ai="$(q "void:mainnet_pillars_with_keys_ai:health:last_5m" \
  "void:mainnet_pillars_with_keys_ai:health:last_5m" | tail -n1)"
h_wc="$(q "void:work_credits:health_v3:last_5m" \
  "void:work_credits:health_v3:last_5m" | tail -n1)"
h_relayers="$(q "void:relayers:health:last_5m" \
  "void:relayers:health:last_5m" | tail -n1)"

echo
echo "--- composite (5m) ---"
h_composite="$(q "void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m" \
  "void:mainnet_pillars_with_keys_ai_wc_relayers:health:last_5m" | tail -n1)"

echo
ok=1

check() {
  local name="$1"
  local val="$2"
  if [ "$val" != "1" ]; then
    echo "[health] $name != 1 (got '$val')" >&2
    ok=0
  fi
}

check "pillars_5m" "$h_pillars"
check "pillars_with_keys_ai_5m" "$h_keys_ai"
check "wc_5m" "$h_wc"
check "relayers_5m" "$h_relayers"
check "composite_5m" "$h_composite"

echo
if [ "$ok" -eq 1 ]; then
  echo "=== [work-credits-health-all] RESULT: OK (all components + composite healthy) ==="
  exit 0
else
  echo "=== [work-credits-health-all] RESULT: BAD (see above components) ===" >&2
  exit 1
fi
