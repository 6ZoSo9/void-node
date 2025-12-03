#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
OUT="${OUT:-/var/lib/node_exporter/textfile_collector/void_mainnet_pillars_with_keys_ai.prom}"

query_one() {
  local q="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$q" \
    | jq -r '.data.result[0].value[1] // empty'
}

echo "=== [pillars-keys-ai] fetching inputs from Prometheus ==="
pillars_raw="$(query_one 'void:mainnet_pillars:health_with_keys:last_5m' || true)"
ai_raw="$(query_one 'void_mainnet_ai_pillar_health' || true)"

pillars="${pillars_raw:-0}"
ai="${ai_raw:-0}"

case "$pillars" in
  1) pillars=1 ;;
  *) pillars=0 ;;
esac

case "$ai" in
  1) ai=1 ;;
  *) ai=0 ;;
esac

combined=0
if [ "$pillars" -eq 1 ] && [ "$ai" -eq 1 ]; then
  combined=1
fi

echo "[pillars-keys-ai] pillars_with_keys=${pillars} ai_pillar=${ai} combined=${combined}"

tmp="$(mktemp)"
cat > "$tmp" <<EOF
# HELP void_mainnet_pillars_with_keys_ai Mainnet pillars+keys+AI composite (1 ok, 0 bad)
# TYPE void_mainnet_pillars_with_keys_ai gauge
void_mainnet_pillars_with_keys_ai $combined
EOF

sudo mkdir -p "$(dirname "$OUT")"
sudo cp "$tmp" "$OUT"
rm -f "$tmp"

echo "[pillars-keys-ai] wrote $OUT"
echo "=== [pillars-keys-ai] done ==="
