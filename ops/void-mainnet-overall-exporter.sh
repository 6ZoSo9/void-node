#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
OUT="${OUT:-/var/lib/node_exporter/textfile_collector/void_mainnet_overall.prom}"

echo "[exporter] prom_url=$PROM_URL"
echo "[exporter] out=$OUT"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# Prefer v2 overall, fall back to v1 if needed
RAW="$(curl -fsS "$PROM_URL/api/v1/query?query=void:mainnet_overall:health:last_5m_v2" \
  | jq -r '.data.result[0].value[1] // ""' || echo "")"

if [ -z "$RAW" ]; then
  echo "[exporter] WARN: no void:mainnet_overall:health:last_5m_v2 result; falling back to v1" >&2
  RAW="$(curl -fsS "$PROM_URL/api/v1/query?query=void:mainnet_overall:health:last_5m" \
    | jq -r '.data.result[0].value[1] // ""' || echo "")"
fi

if [ -z "$RAW" ]; then
  echo "[exporter] ERROR: could not read mainnet_overall health from Prometheus" >&2
  exit 1
fi

VAL="$RAW"
echo "[exporter] mainnet_overall_health=$VAL"

cat >"$TMP" <<EOF
# HELP void_mainnet_overall_health Overall health for VOID mainnet (0..1, 1=ok)
# TYPE void_mainnet_overall_health gauge
void_mainnet_overall_health{chain="mainnet"} $VAL
EOF

TS="$(date +%Y%m%d-%H%M%S)"
if [ -f "$OUT" ]; then
  echo "[exporter] backing up existing $OUT -> ${OUT}.bak-${TS}"
  sudo cp "$OUT" "${OUT}.bak-${TS}"
fi

echo "[exporter] installing to $OUT"
sudo mv "$TMP" "$OUT"
sudo chmod 644 "$OUT"

echo "[exporter] done"
