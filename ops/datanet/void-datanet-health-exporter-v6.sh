#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:4100}"
OUTDIR="${OUTDIR:-/var/lib/node_exporter/textfile_collector}"
OUTFILE="${OUTFILE:-$OUTDIR/void_datanet_health.prom}"
SIZE_BYTES="${SIZE_BYTES:-1024}"
CHUNK_BYTES="${CHUNK_BYTES:-1048576}"

TS="$(date +%s)"
T0_MS="$(python3 - <<'PY'
import time
print(int(time.time()*1000))
PY
)"
TMPDIR="${TMPDIR:-/tmp}"
LOG="$TMPDIR/void-datanet-health-exporter.$TS.out.txt"

set +e
BASE="$BASE" SIZE_BYTES="$SIZE_BYTES" CHUNK_BYTES="$CHUNK_BYTES" ops/datanet/void-datanet-smoke-v6.sh >"$LOG" 2>&1
RC="$?"
set -e

T1_MS="$(python3 - <<'PY'
import time
print(int(time.time()*1000))
PY
)"
DUR_MS="$(( T1_MS - T0_MS ))"
OK=0; [[ "$RC" == "0" ]] && OK=1

STATUS_CODE="$(rg -n '^status_code=' "$LOG" | tail -n 1 | sed 's/^.*status_code=//' || true)"
ROOT="$(rg -n '^dataset_root=' "$LOG" | tail -n 1 | sed 's/^.*dataset_root=//' || true)"
LEAF="$(rg -n '^leaf=' "$LOG" | tail -n 1 | sed 's/^.*leaf=//' || true)"
PCH="$(rg -n '^publish_chunk=' "$LOG" | tail -n 1 | rg -o '\([0-9]{3}\)$' | tr -d '()' || true)"
PMN="$(rg -n '^publish_manifest=' "$LOG" | tail -n 1 | rg -o '\([0-9]{3}\)$' | tr -d '()' || true)"
FGC="$(rg -n '^fetch_chunk=' "$LOG" | tail -n 1 | rg -o '\([0-9]{3}\)$' | tr -d '()' || true)"

put_ok(){ [[ "$1" == "200" || "$1" == "201" || "$1" == "204" ]] && echo 1 || echo 0; }
get_ok(){ [[ "$1" == "200" ]] && echo 1 || echo 0; }

PUT_CH_OK="$(put_ok "${PCH:-0}")"
PUT_MN_OK="$(put_ok "${PMN:-0}")"
GET_CH_OK="$(get_ok "${FGC:-0}")"

NOT_MOUNTED=0
if [[ "${STATUS_CODE:-}" == "404" ]]; then NOT_MOUNTED=1; fi
if rg -q 'status is 404 -> routes not mounted' "$LOG"; then NOT_MOUNTED=1; fi
if rg -q 'got 404 on PUT' "$LOG"; then NOT_MOUNTED=1; fi

TMPPROM="$TMPDIR/void_datanet_health.prom.$$"
cat > "$TMPPROM" <<PROM
# HELP void_datanet_smoke_ok 1 if PUT+GET+roundtrip passed.
# TYPE void_datanet_smoke_ok gauge
void_datanet_smoke_ok $OK
# HELP void_datanet_smoke_ms Duration of last smoke run in ms.
# TYPE void_datanet_smoke_ms gauge
void_datanet_smoke_ms $DUR_MS
# HELP void_datanet_put_chunk_ok 1 if chunk PUT succeeded in last run.
# TYPE void_datanet_put_chunk_ok gauge
void_datanet_put_chunk_ok $PUT_CH_OK
# HELP void_datanet_put_manifest_ok 1 if manifest PUT succeeded in last run.
# TYPE void_datanet_put_manifest_ok gauge
void_datanet_put_manifest_ok $PUT_MN_OK
# HELP void_datanet_get_chunk_ok 1 if chunk GET succeeded in last run.
# TYPE void_datanet_get_chunk_ok gauge
void_datanet_get_chunk_ok $GET_CH_OK
# HELP void_datanet_not_mounted 1 if status/PUT indicates routes missing or filtered to 404.
# TYPE void_datanet_not_mounted gauge
void_datanet_not_mounted $NOT_MOUNTED
PROM

if [[ -n "$ROOT" ]]; then
  SAFE_ROOT="$(echo "$ROOT" | tr -cd '0-9A-Za-z:_\.-')"
  cat >> "$TMPPROM" <<PROM
# HELP void_datanet_last_root_info Last dataset root observed.
# TYPE void_datanet_last_root_info gauge
void_datanet_last_root_info{root="$SAFE_ROOT"} 1
PROM
fi
if [[ -n "$LEAF" ]]; then
  SAFE_LEAF="$(echo "$LEAF" | tr -cd '0-9A-Za-z:_\.-')"
  cat >> "$TMPPROM" <<PROM
# HELP void_datanet_last_leaf_info Last chunk leaf observed.
# TYPE void_datanet_last_leaf_info gauge
void_datanet_last_leaf_info{leaf="$SAFE_LEAF"} 1
PROM
fi

if [[ "$(id -u)" != "0" ]]; then
  cat "$TMPPROM"
  echo "[log] $LOG"
  exit 0
fi

install -d -m 0755 "$OUTDIR"
install -m 0644 "$TMPPROM" "$OUTFILE"
echo "[ok] wrote $OUTFILE"
echo "[log] $LOG"
