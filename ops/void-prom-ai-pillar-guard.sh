#!/usr/bin/env bash
set -euo pipefail
PROM="${PROM:-http://127.0.0.1:9090}"

need() {
  local q="$1"
  local v
  v="$(curl -fsS "$PROM/api/v1/query" --data-urlencode "query=$q" | jq -r '.data.result[0].value[1] // "MISSING"')"
  if [[ "$v" != "1" ]]; then
    echo "[FAIL] $q = $v (expected 1)"
    exit 2
  fi
  echo "[OK]   $q = $v"
}

need 'void:mainnet_pillars:health:last_5m'
need 'void:mainnet_pillars:health_with_keys:last_5m'
need 'void:mainnet_pillars:health_with_keys_and_ai:last_5m'
