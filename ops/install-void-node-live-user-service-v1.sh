#!/usr/bin/env bash
set -euo pipefail

ROOT="${VOID_NODE_ROOT:-$HOME/dev/void-node}"
SERVICE_DIR="$HOME/.config/systemd/user"
SERVICE="$SERVICE_DIR/void-node-live.service"

NODE_PRIVKEY_PATH="${NODE_PRIVKEY_PATH:-$ROOT/.secrets/nodeA.key}"
HTTP_HOST="${HTTP_HOST:-0.0.0.0}"
VOID_HTTP_HOST="${VOID_HTTP_HOST:-}"
HTTP_PORT="${HTTP_PORT:-4100}"
P2P_PORT="${P2P_PORT:-4700}"
NODE_ENV="${NODE_ENV:-dev}"
DATA_DIR="${DATA_DIR:-${VOID_DATA_DIR:-data_a}}"
VOID_DATA_DIR="${VOID_DATA_DIR:-$DATA_DIR}"
VOID_PUBLIC_SEED_ADAPTER_BASE="${VOID_PUBLIC_SEED_ADAPTER_BASE:-http://100.122.79.39:4111}"
START_SERVICE="${START_SERVICE:-0}"

mkdir -p "$SERVICE_DIR"

cat > "$SERVICE" <<UNIT
[Unit]
Description=VOID live node v1
After=default.target

[Service]
Type=simple
WorkingDirectory=$ROOT
Environment=NODE_PRIVKEY_PATH=$NODE_PRIVKEY_PATH
Environment=HTTP_HOST=$HTTP_HOST
Environment=HTTP_PORT=$HTTP_PORT
Environment=P2P_PORT=$P2P_PORT
Environment=NODE_ENV=$NODE_ENV
Environment=DATA_DIR=$DATA_DIR
Environment=VOID_DATA_DIR=$VOID_DATA_DIR
Environment=VOID_PUBLIC_SEED_ADAPTER_BASE=$VOID_PUBLIC_SEED_ADAPTER_BASE
UNIT

if [ -n "$VOID_HTTP_HOST" ]; then
  echo "Environment=VOID_HTTP_HOST=$VOID_HTTP_HOST" >> "$SERVICE"
fi

cat >> "$SERVICE" <<UNIT
ExecStartPre=$ROOT/ops/guard-canonical-producer-liveness-v1.sh
ExecStartPre=$ROOT/ops/kill-void-node-live-listeners-v1.sh
ExecStart=$ROOT/ops/run-void-node-live-v1.sh
Restart=always
RestartSec=5
KillMode=control-group
TimeoutStopSec=10

[Install]
WantedBy=default.target
UNIT

systemctl --user daemon-reload
systemctl --user enable void-node-live.service

if [ "$START_SERVICE" = "1" ]; then
  systemctl --user restart void-node-live.service
fi

echo "installed $SERVICE"
systemctl --user show void-node-live.service -p UnitFileState -p FragmentPath
