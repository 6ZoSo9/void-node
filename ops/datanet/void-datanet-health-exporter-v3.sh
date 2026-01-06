#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:4100}"
OUTDIR="${OUTDIR:-/var/lib/node_exporter/textfile_collector}"
OUTFILE="${OUTFILE:-$OUTDIR/void_datanet_health.prom}"

TS="$(date +%s)"
T0_MS="$(python3 - <<'PY'
import time
print(int(time.time()*1000))
PY
)"
TMPDIR="${TMPDIR:-/tmp}"
LOG="$TMPDIR/void-datanet-health-exporter.$TS.out.txt"

set +e
BASE="$BASE" SIZE_BYTES="${SIZE_BYTES:-1024}" ops/datanet/void-datanet-smoke-v3.sh >"$LOG" 2>&1
RC="$?"
set -e

T1_MS="$(python3 - <<'PY'
import time
print(int(time.time()*1000))
PY
)"
DUR_MS="$(( T1_MS - T0_MS ))"

OK=0
if [[ "$RC" == "0" ]]; then OK=1; fi

DATASET_ID="$(rg -n '^dataset_id=' "$LOG" | tail -n 1 | sed 's/^.*dataset_id=//' || true)"
PUB="$(rg -n '^publish=' "$LOG" | tail -n 1 | sed 's/^.*publish=//' || true)"

TMPPROM="$TMPDIR/void_datanet_health.prom.$$"
cat > "$TMPPROM" <<PROM
# HELP void_datanet_smoke_ok 1 if publish->fetch->roundtrip smoke passed.
# TYPE void_datanet_smoke_ok gauge
void_datanet_smoke_ok $OK
# HELP void_datanet_smoke_ms Duration of last smoke run in ms.
# TYPE void_datanet_smoke_ms gauge
void_datanet_smoke_ms $DUR_MS
PROM

if [[ -n "$DATASET_ID" ]]; then
  SAFE_ID="$(echo "$DATASET_ID" | tr -cd '0-9A-Za-z:_\.-')"
  cat >> "$TMPPROM" <<PROM
# HELP void_datanet_last_dataset_info Last dataset id observed by the smoke probe.
# TYPE void_datanet_last_dataset_info gauge
void_datanet_last_dataset_info{dataset_id="$SAFE_ID"} 1
PROM
fi

if [[ -n "$PUB" ]]; then
  SAFE_PUB="$(echo "$PUB" | tr -cd '0-9A-Za-z:/\._\-\?\=\&\ %')"
  cat >> "$TMPPROM" <<PROM
# HELP void_datanet_last_publish_info Last publish path/mode observed.
# TYPE void_datanet_last_publish_info gauge
void_datanet_last_publish_info{pub="$SAFE_PUB"} 1
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
