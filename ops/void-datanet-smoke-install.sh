#!/usr/bin/env bash
set -euo pipefail
sudo -v

BIN="/usr/local/bin/void-datanet-smoke.sh"
SERVICE="/etc/systemd/system/void-datanet-smoke.service"
TIMER="/etc/systemd/system/void-datanet-smoke.timer"

sudo install -d -m 0755 /usr/local/bin

sudo tee "$BIN" >/dev/null <<'BASH'
#!/usr/bin/env bash
set -euo pipefail

OUTDIR="/var/lib/node_exporter/textfile_collector"
OUT="$OUTDIR/void_datanet_smoke.prom"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

mkdir -p "$OUTDIR"

MAIN="http://localhost:4100"
ok=1
reason="ok"

# fast endpoints only
if ! curl -fsS --max-time 2 "$MAIN/datanet/v1/status" >/dev/null; then
  ok=0; reason="status_fail"
fi
if ! curl -fsS --max-time 2 "$MAIN/metrics/void/head.v2" | rg -q '^void_head_number '; then
  ok=0; reason="headv2_fail"
fi

ts="$(date +%s)"
{
  echo "# HELP void_datanet_smoke_ok 1 if datanet smoke succeeded"
  echo "# TYPE void_datanet_smoke_ok gauge"
  echo "void_datanet_smoke_ok $ok"
  echo "# HELP void_datanet_smoke_last_run_seconds Last run unix time"
  echo "# TYPE void_datanet_smoke_last_run_seconds gauge"
  echo "void_datanet_smoke_last_run_seconds $ts"
  echo "# HELP void_datanet_smoke_last_error 1 if last run failed (label reason)"
  echo "# TYPE void_datanet_smoke_last_error gauge"
  if [[ "$ok" == "1" ]]; then
    echo 'void_datanet_smoke_last_error{reason="ok"} 0'
  else
    echo "void_datanet_smoke_last_error{reason=\"$reason\"} 1"
  fi
} > "$TMP"

sudo install -m 0644 "$TMP" "$OUT"
BASH
sudo chmod 0755 "$BIN"

sudo tee "$SERVICE" >/dev/null <<'UNIT'
[Unit]
Description=VOID DataNet smoke (fast)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/void-datanet-smoke.sh
UNIT

sudo tee "$TIMER" >/dev/null <<'UNIT'
[Unit]
Description=Run VOID DataNet smoke every 2 minutes

[Timer]
OnBootSec=30s
OnUnitActiveSec=2m
AccuracySec=10s
Persistent=true

[Install]
WantedBy=timers.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now void-datanet-smoke.timer
sudo systemctl start void-datanet-smoke.service || true

echo "=== installed ==="
sudo systemctl list-timers --all | rg -n 'void-datanet-smoke' || true
sudo head -n 80 /var/lib/node_exporter/textfile_collector/void_datanet_smoke.prom
