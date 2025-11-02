#!/usr/bin/env bash
set -euo pipefail
sudo install -m 0644 ops/systemd/void-prom-snap-root.service /etc/systemd/system/
sudo install -m 0644 ops/systemd/void-prom-snap-root.timer   /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now void-prom-snap-root.timer
echo "[ok] root timer enabled:"
systemctl status void-prom-snap-root.timer --no-pager | sed -n '1,8p'
