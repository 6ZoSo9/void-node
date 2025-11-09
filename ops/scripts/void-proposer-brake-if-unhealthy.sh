#!/usr/bin/env bash
set -euo pipefail
TFD="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT="$TFD/void_proposer_brake.prom"
HTTP="${HTTP_PORT:-4100}"

# Cheap lock (root writes)
exec 9>/run/voidlocks/void-proposer-brake.lock
flock -n 9 || exit 0

q(){ curl -fsS 'http://127.0.0.1:9090/api/v1/query' \
      --data-urlencode "query=void:system:green:hard" | jq -r '.data.result[].value[1]' 2>/dev/null; }
green=${FORCE_BRAKE:-""}
if [[ -z "${green}" ]]; then green="$(q || echo 0)"; fi

did=0
if [[ "$green" = "0" ]]; then
  curl -fsS -X POST "http://127.0.0.1:${HTTP}/proposer/auto/stop" >/dev/null || true
  did=1
fi

ts=$(date +%s); mkdir -p "$TFD"
{
  echo "# HELP void_proposer_brakes_total Brake activations due to unhealthy fence"
  echo "# TYPE void_proposer_brakes_total counter"
  [[ -f "$OUT" ]] && old=$(grep -E '^void_proposer_brakes_total ' "$OUT" | awk '{print $2}') || old=0
  if [[ "$did" = "1" ]]; then echo "void_proposer_brakes_total $((old+1))"; else echo "void_proposer_brakes_total ${old:-0}"; fi

  echo "# HELP void_proposer_last_brake_ts Unix time of last brake"
  echo "# TYPE void_proposer_last_brake_ts gauge"
  if [[ "$did" = "1" ]]; then echo "void_proposer_last_brake_ts $ts"
  else [[ -f "$OUT" ]] && grep -E '^void_proposer_last_brake_ts ' "$OUT" || echo "void_proposer_last_brake_ts 0"; fi
} > "$OUT.tmp" && mv -f "$OUT.tmp" "$OUT"
