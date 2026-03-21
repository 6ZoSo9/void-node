#!/usr/bin/env bash
set -euo pipefail

# Repo-tracked exporter:
# Runs DataNet MVP roundtrip smoke and exports node_exporter textfile metrics
# using the SAME names your Prom pillar rules already expect.

REPO="${REPO:-$HOME/dev/void-node}"
ROUNDTRIP="${ROUNDTRIP:-$REPO/ops/bin/datanet-mvp-roundtrip.sh}"

# IMPORTANT: match the pillar/rules naming
PROM_OUT_NAME="${PROM_OUT_NAME:-void_datanet_mvp_roundtrip.prom}"

TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
STATE_DIR="${STATE_DIR:-/var/lib/void-node}"
FAIL_FILE="$STATE_DIR/datanet_mvp_roundtrip_failures_total.txt"
LAST_OK_FILE="$STATE_DIR/datanet_mvp_roundtrip_last_ok_ts_seconds.txt"
LAST_ERR_FILE="$STATE_DIR/datanet_mvp_roundtrip_last_err.txt"

# root-safe: if run as non-root, require sudo but don't prompt mid-run
SUDO=""
if [[ "${EUID:-0}" -ne 0 ]]; then
  SUDO="sudo -n"
  if ! sudo -n true 2>/dev/null; then
    echo "[FAIL] sudo not cached. Run: sudo -v  (then re-run this exporter)" >&2
    exit 11
  fi
fi

$SUDO mkdir -p "$STATE_DIR" "$TEXTFILE_DIR"

TS="$(date +%Y%m%d-%H%M%S)"
LOG="/tmp/void-datanet-mvp-roundtrip.$TS.out.txt"

start_s="$(date +%s)"
set +e
timeout 25s bash "$ROUNDTRIP" "pillar-smoke $TS" >"$LOG" 2>&1
rc="$?"
set -e
end_s="$(date +%s)"
dur_s="$(( end_s - start_s ))"

now_epoch="$(date +%s)"
ok=0
err=""

if [[ "$rc" == "0" ]]; then
  ok=1
  err=""
  $SUDO bash -lc "echo '$now_epoch' > '$LAST_OK_FILE'"
else
  ok=0
  err="rc=$rc"
  # bump failures_total
  cur="0"
  if $SUDO test -f "$FAIL_FILE"; then
    cur="$($SUDO cat "$FAIL_FILE" 2>/dev/null || echo 0)"
  fi
  [[ "$cur" =~ ^[0-9]+$ ]] || cur="0"
  $SUDO bash -lc "echo $((cur+1)) > '$FAIL_FILE'"
  $SUDO bash -lc "printf '%s\n' \"${err}\" > '$LAST_ERR_FILE'"
fi

failures="0"
if $SUDO test -f "$FAIL_FILE"; then
  failures="$($SUDO cat "$FAIL_FILE" 2>/dev/null || echo 0)"
fi
[[ "$failures" =~ ^[0-9]+$ ]] || failures="0"

last_ok="0"
if $SUDO test -f "$LAST_OK_FILE"; then
  last_ok="$($SUDO cat "$LAST_OK_FILE" 2>/dev/null || echo 0)"
fi
[[ "$last_ok" =~ ^[0-9]+$ ]] || last_ok="0"

# Best-effort last error string (safe for prom label)
if $SUDO test -f "$LAST_ERR_FILE"; then
  err="$($SUDO cat "$LAST_ERR_FILE" 2>/dev/null || echo "")"
fi
err="${err//$'\n'/ }"
err="${err//\"/'}"
err="${err:0:180}"

tmp="$(mktemp)"
cat > "$tmp" <<EOF
# HELP void_datanet_mvp_roundtrip_ok DataNet MVP v1 publish->fetch->decrypt roundtrip (1=ok,0=fail)
# TYPE void_datanet_mvp_roundtrip_ok gauge
void_datanet_mvp_roundtrip_ok $ok

# HELP void_datanet_mvp_roundtrip_last_run_ts_seconds Last run timestamp (epoch seconds)
# TYPE void_datanet_mvp_roundtrip_last_run_ts_seconds gauge
void_datanet_mvp_roundtrip_last_run_ts_seconds $now_epoch

# HELP void_datanet_mvp_roundtrip_last_ok_ts_seconds Last OK timestamp (epoch seconds; 0 if never)
# TYPE void_datanet_mvp_roundtrip_last_ok_ts_seconds gauge
void_datanet_mvp_roundtrip_last_ok_ts_seconds $last_ok

# HELP void_datanet_mvp_roundtrip_duration_seconds Duration of last run in seconds
# TYPE void_datanet_mvp_roundtrip_duration_seconds gauge
void_datanet_mvp_roundtrip_duration_seconds $dur_s

# HELP void_datanet_mvp_roundtrip_failures_total Total failures observed by exporter (monotonic)
# TYPE void_datanet_mvp_roundtrip_failures_total counter
void_datanet_mvp_roundtrip_failures_total $failures

# HELP void_datanet_mvp_roundtrip_last_err_info 1 with label err=... when last run failed
# TYPE void_datanet_mvp_roundtrip_last_err_info gauge
void_datanet_mvp_roundtrip_last_err_info{err="$err"} 1
EOF

$SUDO mv "$tmp" "$TEXTFILE_DIR/$PROM_OUT_NAME"
$SUDO chmod 0644 "$TEXTFILE_DIR/$PROM_OUT_NAME"

if [[ "$ok" == "1" ]]; then
  echo "[ok] roundtrip ok=1 dur_s=$dur_s log=$LOG"
else
  echo "[BAD] roundtrip ok=0 rc=$rc dur_s=$dur_s log=$LOG"
  tail -n 40 "$LOG" || true
fi
