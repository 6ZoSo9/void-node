#!/usr/bin/env bash
set -euo pipefail
HTTP="${HTTP_PORT:-4100}"
DIR="${TEXTFILE_DIR:-$HOME/.cache/node-exporter-textfile}"
OUT="$DIR/void_proposer_autotune.prom"
TMP="$OUT.tmp.$$"
mkdir -p "$DIR"

q(){ curl -fsS --max-time 2 "http://127.0.0.1:${HTTP}$1" 2>/dev/null || true; }
ok(){ curl -fsS -o /dev/null --max-time 2 "http://127.0.0.1:${HTTP}$1" 2>/dev/null || true; }

EN=$(q /proposer/auto/status2 | jq -r '.enabled//0' 2>/dev/null || echo 0)
MP=$(q /mempool/global/size.json | jq -r '.size//0' 2>/dev/null || echo 0)

# piecewise target (ms): 0=>2000, 1-5=>1500, 6-20=>1000, >20=>600
MS=2000
(( MP>=1  && MP<=5 ))  && MS=1500
(( MP>=6  && MP<=20 )) && MS=1000
(( MP>20 ))            && MS=600

# Nudge only if enabled
if [[ "$EN" = "1" ]]; then
  ok "/proposer/auto/start?ms=${MS}"
fi

cat >"$TMP" <<EOF
# HELP void_proposer_tick_ms Current target tick in ms (autotune)
# TYPE void_proposer_tick_ms gauge
void_proposer_tick_ms ${MS}
# HELP void_mempool_size Global mempool size (sampled)
# TYPE void_mempool_size gauge
void_mempool_size ${MP}
EOF
mv -f "$TMP" "$OUT"; chmod 0644 "$OUT"
