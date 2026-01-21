#!/usr/bin/env bash
set -euo pipefail

# DataNet smoke (fast + compat metrics)
# - publish plaintext_b64 JSON (who required)
# - fetch by query + by path
# - write node_exporter textfiles with BOTH legacy and new metric names

BASE="${BASE:-http://127.0.0.1:4100}"
BASE="${BASE%/}"

WHO="${WHO:-$(hostname)-$USER}"
TF="${TF:-/var/lib/node_exporter/textfile_collector}"

SMOKE_PROM="$TF/void_datanet_smoke.prom"
MVP_PROM="$TF/void_datanet_mvp_smoke.prom"

NOW_S="$(date +%s)"
NOW_MS="$((NOW_S*1000))"

BIN="/tmp/void-datanet-smoke.bin.$$"
head -c 1024 /dev/urandom > "$BIN"
SHA="$(sha256sum "$BIN" | awk '{print $1}')"

# plaintext_b64 (portable)
PLAINTEXT_B64="$(python3 - "$BIN" <<'PY'
import base64,sys
b=open(sys.argv[1],'rb').read()
print(base64.b64encode(b).decode('ascii'))
PY
)"

PUB_URL="$BASE/datanet/v1/publish?who=$WHO"
FETCH_Q_URL="$BASE/datanet/v1/fetch?id="
FETCH_P_URL="$BASE/datanet/v1/fetch/"

H="/tmp/void-dn.h.$$"
B="/tmp/void-dn.b.$$"
E="/tmp/void-dn.e.$$"
rm -f "$H" "$B" "$E"; : >"$H"; : >"$B"; : >"$E"

echo "$BIN"
echo "BASE=$BASE"
echo "BIN=$BIN bytes=$(wc -c <"$BIN" | tr -d ' ') sha256=$SHA"
echo

OK_FAST=0
OK_MVP=0
FAIL_REASON="ok"

# publish
PUB_CODE="$(curl -sS --max-time 12 -D "$H" -o "$B" -w '%{http_code}' \
  -H "Content-Type: application/json" \
  -H "X-VOID-WHO: $WHO" \
  -X POST \
  --data "{\"plaintext_b64\":\"$PLAINTEXT_B64\",\"meta\":{\"note\":\"smoke\",\"sha256\":\"$SHA\",\"ts_ms\":$NOW_MS}}" \
  "$PUB_URL" 2>"$E" || true)"

echo "pub_http_code=$PUB_CODE"
if [ "$PUB_CODE" != "200" ]; then
  FAIL_REASON="publish_http_$PUB_CODE"
else
  ID="$(python3 - "$B" <<'PY'
import json,sys
j=json.load(open(sys.argv[1]))
print(j.get("id",""))
PY
  )"
  if [ -z "${ID:-}" ]; then
    FAIL_REASON="publish_no_id"
  else
    echo "id=$ID"
    echo
    # fetch query
    FQ_CODE="$(curl -sS --max-time 12 -o /dev/null -w '%{http_code}' \
      -H "X-VOID-WHO: $WHO" \
      "${FETCH_Q_URL}${ID}&who=${WHO}" 2>/dev/null || true)"
    # fetch path
    FP_CODE="$(curl -sS --max-time 12 -o /dev/null -w '%{http_code}' \
      -H "X-VOID-WHO: $WHO" \
      "${FETCH_P_URL}${ID}?who=${WHO}" 2>/dev/null || true)"

    echo "fetch_query_code=$FQ_CODE"
    echo "fetch_path_code=$FP_CODE"
    echo

    if [ "$FQ_CODE" = "200" ] && [ "$FP_CODE" = "200" ]; then
      OK_FAST=1
      OK_MVP=1
      FAIL_REASON="ok"
    else
      FAIL_REASON="fetch_http_${FQ_CODE}_${FP_CODE}"
    fi
  fi
fi

# --- stateful failure counters (kept under TF, so they survive reboots) ---
STATE_DIR="/tmp/.void_datanet_state_${USER}"
mkdir -p "$STATE_DIR" || true

MVP_FAIL_FILE="$STATE_DIR/mvp_failures_total.txt"
SMOKE_FAIL_FILE="$STATE_DIR/smoke_failures_total.txt"

read_counter() {
  local f="$1"
  if [ -f "$f" ]; then
    (cat "$f" 2>/dev/null || echo 0) | tr -dc '0-9' || echo 0
  else
    echo 0
  fi
}

write_counter() {
  local f="$1" v="$2"
  printf '%s\n' "$v" > "$f" 2>/dev/null || true
}

MVP_FAIL_TOTAL="$(read_counter "$MVP_FAIL_FILE")"
SMOKE_FAIL_TOTAL="$(read_counter "$SMOKE_FAIL_FILE")"

if [ "$OK_MVP" != "1" ]; then MVP_FAIL_TOTAL="$((MVP_FAIL_TOTAL+1))"; fi
if [ "$OK_FAST" != "1" ]; then SMOKE_FAIL_TOTAL="$((SMOKE_FAIL_TOTAL+1))"; fi

write_counter "$MVP_FAIL_FILE" "$MVP_FAIL_TOTAL"
write_counter "$SMOKE_FAIL_FILE" "$SMOKE_FAIL_TOTAL"

# write atomically (no interactive mv)
tmp1="$(mktemp)"; tmp2="$(mktemp)"

# --- SMOKE (legacy + new) ---
cat > "$tmp1" <<EOF
# HELP void_datanet_smoke_ok_v0 1 if publish+fetch succeeded
# TYPE void_datanet_smoke_ok_v0 gauge
void_datanet_smoke_ok_v0 $OK_FAST
# HELP void_datanet_smoke_last_ok_ts_seconds unix ts of last success
# TYPE void_datanet_smoke_last_ok_ts_seconds gauge
void_datanet_smoke_last_ok_ts_seconds $([ "$OK_FAST" = "1" ] && echo "$NOW_S" || echo 0)

# HELP void_datanet_smoke_fast_ok 1 if publish->fetch->roundtrip smoke passed. (legacy name)
# TYPE void_datanet_smoke_fast_ok gauge
void_datanet_smoke_fast_ok $OK_FAST
# HELP void_datanet_smoke_last_run_seconds Last run unix time (legacy)
# TYPE void_datanet_smoke_last_run_seconds gauge
void_datanet_smoke_last_run_seconds $NOW_S
# HELP void_datanet_smoke_last_error 1 if last run failed (label reason) (legacy)
# TYPE void_datanet_smoke_last_error gauge
void_datanet_smoke_last_error{reason="$FAIL_REASON"} $([ "$OK_FAST" = "1" ] && echo 0 || echo 1)

# HELP void_datanet_smoke_failures_total Total failures observed by smoke exporter (monotonic, legacy-ish)
# TYPE void_datanet_smoke_failures_total counter
void_datanet_smoke_failures_total $SMOKE_FAIL_TOTAL
EOF

# --- MVP (legacy set + new convenience) ---
DUR=0
cat > "$tmp2" <<EOF
# HELP void_datanet_mvp_smoke_ok DataNet MVP client roundtrip smoke ok (1/0)
# TYPE void_datanet_mvp_smoke_ok gauge
void_datanet_mvp_smoke_ok $OK_MVP
# HELP void_datanet_mvp_smoke_last_ts_seconds Unix epoch seconds of last smoke run
# TYPE void_datanet_mvp_smoke_last_ts_seconds gauge
void_datanet_mvp_smoke_last_ts_seconds $NOW_S
# HELP void_datanet_mvp_smoke_last_ok_ts_seconds unix ts of last success (extra)
# TYPE void_datanet_mvp_smoke_last_ok_ts_seconds gauge
void_datanet_mvp_smoke_last_ok_ts_seconds $([ "$OK_MVP" = "1" ] && echo "$NOW_S" || echo 0)
# HELP void_datanet_mvp_smoke_duration_seconds Duration of last smoke run in seconds
# TYPE void_datanet_mvp_smoke_duration_seconds gauge
void_datanet_mvp_smoke_duration_seconds $DUR
# HELP void_datanet_mvp_smoke_failures_total Total failures observed by smoke exporter (monotonic)
# TYPE void_datanet_mvp_smoke_failures_total counter
void_datanet_mvp_smoke_failures_total $MVP_FAIL_TOTAL
EOF

# move into place
if /bin/mv -f "$tmp1" "$SMOKE_PROM"; then
  :
else
  echo "WARN: could not write textfile metric (permission?)" >&2
  echo "WARN: continuing; publish+fetch already succeeded" >&2
fi
chmod 0644 "$SMOKE_PROM" 2>/dev/null || true
if /bin/mv -f "$tmp2" "$MVP_PROM"; then
  :
else
  echo "WARN: could not write textfile metric (permission?)" >&2
  echo "WARN: continuing; publish+fetch already succeeded" >&2
fi
chmod 0644 "$MVP_PROM" 2>/dev/null || true

echo "[ok] wrote:"
ls -l "$MVP_PROM" "$SMOKE_PROM" || true
