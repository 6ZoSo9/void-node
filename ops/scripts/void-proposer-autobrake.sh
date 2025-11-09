#!/usr/bin/env bash
set -euo pipefail
HTTP="${HTTP_PORT:-4100}"
DIR="${TEXTFILE_DIR:-$HOME/.cache/node-exporter-textfile}"
OUT="$DIR/void_proposer_brake.prom"
TMP="$OUT.tmp.$$"
mkdir -p "$DIR"

get(){ curl -fsS --max-time 2 "http://127.0.0.1:${HTTP}$1" 2>/dev/null || true; }
ok(){  curl -fsS -o /dev/null --max-time 2 "http://127.0.0.1:${HTTP}$1" 2>/dev/null || true; }

MATCH=$(get /__void/metrics/header3.prom | awk -F' ' '/^void_header3_match\{/ {v=$NF} END{print v+0}' || echo 1)
BRAKE=0
if [[ "$MATCH" = "0" ]]; then
  ok /proposer/auto/disable
  BRAKE=1
fi

cat >"$TMP" <<EOF
# HELP void_proposer_brake Braked (1) due to txroot mismatch
# TYPE void_proposer_brake gauge
void_proposer_brake ${BRAKE}
EOF
mv -f "$TMP" "$OUT"; chmod 0644 "$OUT"
