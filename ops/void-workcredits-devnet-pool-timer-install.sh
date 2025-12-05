#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="/home/zoso/dev/void-node"

SERVICE_UNIT="/etc/systemd/system/void-workcredits-devnet-pool.service"
TIMER_UNIT="/etc/systemd/system/void-workcredits-devnet-pool.timer"

echo "[install] writing $SERVICE_UNIT"
cat > "$SERVICE_UNIT" <<'EOF'
[Unit]
Description=VOID WorkCredits devnet pool exporter
Documentation=none

[Service]
Type=oneshot
User=root
Group=root
WorkingDirectory=/home/zoso/dev/void-node
ExecStart=/usr/bin/env bash -c './ops/void-workcredits-devnet-pool-exporter.sh'
Nice=10

[Install]
WantedBy=multi-user.target
EOF

echo "[install] writing $TIMER_UNIT"
cat > "$TIMER_UNIT" <<'EOF'
[Unit]
Description=Run VOID WorkCredits devnet pool exporter periodically
Documentation=none

[Timer]
OnBootSec=30
OnUnitActiveSec=30
Unit=void-workcredits-devnet-pool.service
AccuracySec=5s

[Install]
WantedBy=timers.target
EOF

echo "[install] reloading systemd + enabling timer"
systemctl daemon-reload
systemctl enable --now void-workcredits-devnet-pool.timer

echo "[install] current timer status:"
systemctl list-timers void-workcredits-devnet-pool.timer || true

echo "[install] done."
