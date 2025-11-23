#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
OUT='/var/lib/node_exporter/textfile_collector/void_mainnet_core.prom'

query_scalar() {
  local q="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$q" \
  | jq -r '.data.result[0].value[1] // "0"'
}

# Mirror the core health scalar from Prom into a labeled series
RAW="$(query_scalar 'max(void_mainnet_core_health)')"

case "$RAW" in
  0|1) ;;   # ok
  *) RAW="0" ;;
esac

TMP="$(mktemp)"
cat > "$TMP" <<TXT
# HELP void_mainnet_core_health Mainnet-core health (1=ok,0=bad) – mirrored from Prom
# TYPE void_mainnet_core_health gauge
void_mainnet_core_health{chain="mainnet-core"} $RAW
TXT

mv "$TMP" "$OUT"
