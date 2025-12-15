#!/usr/bin/env bash
set -euo pipefail

TEXTFILE="/var/lib/node_exporter/textfile_collector/void_devnet_jobs_status_v2.prom"
SVC="void-devnet-jobs-v2.service"
TMR="void-devnet-jobs-v2.timer"

echo "=== [timer] ==="
sudo systemctl is-enabled "$TMR" >/dev/null 2>&1 && echo "enabled=1" || echo "enabled=0"
sudo systemctl is-active "$TMR"  >/dev/null 2>&1 && echo "active=1"  || echo "active=0"
sudo systemctl list-timers --all | grep -E "$TMR" || true

echo
echo "=== [last service run] ==="
sudo systemctl status "$SVC" -l --no-pager | sed -n '1,40p' || true

echo
echo "=== [textfile] ==="
sudo ls -l "$TEXTFILE" || true
sudo tail -n 40 "$TEXTFILE" 2>/dev/null || true

echo
echo "=== [node_exporter scrape] ==="
curl -fsS http://127.0.0.1:9100/metrics | grep -E 'void_devnet_jobs_status_v2_' | head -n 60 || true
