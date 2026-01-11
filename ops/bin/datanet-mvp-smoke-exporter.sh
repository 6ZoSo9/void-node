#!/usr/bin/env bash
set -euo pipefail

# Runs the client-side publish->fetch->decrypt+verify smoke and exports results
# as node_exporter textfile metrics (single .prom file, atomic write).

REPO="${REPO:-$HOME/dev/void-node}"
ROUNDTRIP="${ROUNDTRIP:-$REPO/ops/bin/datanet-mvp-roundtrip.sh}"
PROM_OUT_NAME="${PROM_OUT_NAME:-void_datanet_mvp_smoke.prom}"

# Try to auto-detect node_exporter textfile dir if not provided.
TEXTFILE_DIR="${TEXTFILE_DIR:-}"
if [[ -z "${TEXTFILE_DIR}" ]]; then
  for svc in node_exporter prometheus-node-exporter; do
    if systemctl list-unit-files | rg -q "^${svc}\.service"; then
      ES="$(systemctl show -p ExecStart --value "$svc" 2>/dev/null | head -n 1 || true)"
      if [[ "$ES" =~ --collector\.textfile\.directory=([^[:space:]]+) ]]; then
        TEXTFILE_DIR="${BASH_REMATCH[1]}"
        break
      fi
    fi
  done
fi
TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"

STATE_DIR="${STATE_DIR:-/var/lib/void-node}"
FAIL_FILE="$STATE_DIR/datanet_mvp_smoke_failures_total.txt"

sudo mkdir -p "$STATE_DIR" "$TEXTFILE_DIR"

# Run smoke ultralow (cap time + save log)
TS="$(date +%Y%m%d-%H%M%S)"
LOG="/tmp/void-datanet-mvp-smoke.$TS.out.txt"

start_s="$(date +%s)"
ok=0
set +e
timeout 25s bash "$ROUNDTRIP" "pillar-smoke $TS" >"$LOG" 2>&1
rc="$?"
set -e
end_s="$(date +%s)"
dur_s="$(( end_s - start_s ))"

if [[ "$rc" == "0" ]]; then
  ok=1
else
  ok=0
  # bump failures_total
  cur="0"
  if sudo test -f "$FAIL_FILE"; then
    cur="$(sudo cat "$FAIL_FILE" 2>/dev/null || echo 0)"
  fi
  [[ "$cur" =~ ^[0-9]+$ ]] || cur="0"
  sudo bash -lc "echo $((cur+1)) > '$FAIL_FILE'"
fi

failures="0"
if sudo test -f "$FAIL_FILE"; then
  failures="$(sudo cat "$FAIL_FILE" 2>/dev/null || echo 0)"
fi
[[ "$failures" =~ ^[0-9]+$ ]] || failures="0"

now_epoch="$(date +%s)"

tmp="$(mktemp)"
cat > "$tmp" <<EOF
# HELP void_datanet_mvp_smoke_ok DataNet MVP client roundtrip smoke ok (1/0)
# TYPE void_datanet_mvp_smoke_ok gauge
void_datanet_mvp_smoke_ok $ok

# HELP void_datanet_mvp_smoke_last_ts_seconds Unix epoch seconds of last smoke run
# TYPE void_datanet_mvp_smoke_last_ts_seconds gauge
void_datanet_mvp_smoke_last_ts_seconds $now_epoch

# HELP void_datanet_mvp_smoke_duration_seconds Duration of last smoke run in seconds
# TYPE void_datanet_mvp_smoke_duration_seconds gauge
void_datanet_mvp_smoke_duration_seconds $dur_s

# HELP void_datanet_mvp_smoke_failures_total Total failures observed by smoke exporter (monotonic)
# TYPE void_datanet_mvp_smoke_failures_total counter
void_datanet_mvp_smoke_failures_total $failures
EOF

# atomic install of .prom
sudo mv "$tmp" "$TEXTFILE_DIR/$PROM_OUT_NAME"
sudo chmod 0644 "$TEXTFILE_DIR/$PROM_OUT_NAME"

# ultralow: print only the status line + where log is
if [[ "$ok" == "1" ]]; then
  echo "[ok] smoke ok=1 dur_s=$dur_s log=$LOG"
else
  echo "[BAD] smoke ok=0 rc=$rc dur_s=$dur_s log=$LOG"
  echo "[BAD] last 40 log lines:"
  tail -n 40 "$LOG" || true
fi
