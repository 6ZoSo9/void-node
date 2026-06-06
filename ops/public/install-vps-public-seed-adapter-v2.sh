#!/usr/bin/env bash
set -euo pipefail

ROOT="${VOID_NODE_ROOT:-$HOME/dev/void-node}"
SERVICE_DIR="$HOME/.config/systemd/user"
SERVICE="$SERVICE_DIR/void-vps-public-seed-adapter.service"

VOID_SEED_UPSTREAM="${VOID_SEED_UPSTREAM:-http://100.122.79.39:4100}"
VOID_ADAPTER_HOST="${VOID_ADAPTER_HOST:-0.0.0.0}"
VOID_ADAPTER_PORT="${VOID_ADAPTER_PORT:-8080}"
START_SERVICE="${START_SERVICE:-0}"

mkdir -p "$SERVICE_DIR"

cat > "$SERVICE" <<UNIT
[Unit]
Description=VOID VPS public seed adapter v2
After=default.target

[Service]
Type=simple
WorkingDirectory=$ROOT
Environment=VOID_SEED_UPSTREAM=$VOID_SEED_UPSTREAM
Environment=VOID_ADAPTER_HOST=$VOID_ADAPTER_HOST
Environment=VOID_ADAPTER_PORT=$VOID_ADAPTER_PORT
ExecStart=$ROOT/ops/public/run-public-seed-adapter-v1.sh
Restart=always
RestartSec=5
KillMode=control-group
TimeoutStopSec=10

[Install]
WantedBy=default.target
UNIT

systemctl --user daemon-reload
systemctl --user enable void-vps-public-seed-adapter.service

if [ "$START_SERVICE" = "1" ]; then
  systemctl --user restart void-vps-public-seed-adapter.service
fi

echo "installed $SERVICE"
systemctl --user show void-vps-public-seed-adapter.service -p UnitFileState -p FragmentPath
