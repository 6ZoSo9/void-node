#!/usr/bin/env bash
set -euo pipefail
sudo -v

sudo systemctl disable --now void-datanet-smoke.timer 2>/dev/null || true
sudo rm -f /etc/systemd/system/void-datanet-smoke.timer /etc/systemd/system/void-datanet-smoke.service
sudo rm -f /usr/local/bin/void-datanet-smoke.sh
sudo rm -f /var/lib/node_exporter/textfile_collector/void_datanet_smoke.prom
sudo systemctl daemon-reload

echo "=== removed ==="
sudo systemctl list-timers --all | rg -n 'void-datanet-smoke' || true
