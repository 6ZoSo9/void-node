#!/usr/bin/env bash
set -euo pipefail
TFD="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT="$TFD/void_proposer_kick.prom"
HTTP="${HTTP_PORT:-4100}"

# Cheap lock (root writes)
exec 9>/run/voidlocks/void-proposer-kick.lock
flock -n 9 || exit 0

q(){ curl -fsS 'http://127.0.0.1:9090/api/v1/query' \
      --data-urlencode "query=void:head:adv_ok_scalar" | jq -r '.data.result[].value[1]' 2>/dev/null; }
adv_ok=${FORCE_KICK:-""}
if [[ -z "${adv_ok}" ]]; then adv_ok="$(q || echo 0)"; fi

did=0
if [[ "$adv_ok" = "0" ]]; then
  curl -fsS -X POST "http://127.0.0.1:${HTTP}/proposer/auto/start?ms=2000" >/dev/null || true
  did=1
fi

ts=$(date +%s); mkdir -p "$TFD"
{
  echo "# HELP void_proposer_kicks_total Kick activations to unstall head"
  echo "# TYPE void_proposer_kicks_total counter"
  [[ -f "$OUT" ]] && old=$(grep -E '^void_proposer_kicks_total ' "$OUT" | awk '{print $2}') || old=0
  if [[ "$did" = "1" ]]; then echo "void_proposer_kicks_total $((old+1))"; else echo "void_proposer_kicks_total ${old:-0}"; fi

  echo "# HELP void_proposer_last_kick_ts Unix time of last kick"
  echo "# TYPE void_proposer_last_kick_ts gauge"
  if [[ "$did" = "1" ]]; then echo "void_proposer_last_kick_ts $ts"
  else [[ -f "$OUT" ]] && grep -E '^void_proposer_last_kick_ts ' "$OUT" || echo "void_proposer_last_kick_ts 0"; fi
} > "$OUT.tmp" && mv -f "$OUT.tmp" "$OUT"
