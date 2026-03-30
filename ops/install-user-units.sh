#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
USER_UNIT_DIR="${USER_UNIT_DIR:-$HOME/.config/systemd/user}"
MAIN_UNIT="${MAIN_UNIT:-void-node.service}"
FOLLOW_ONCE_SERVICE="${FOLLOW_ONCE_SERVICE:-void-follower-once.service}"
FOLLOW_ONCE_TIMER="${FOLLOW_ONCE_TIMER:-void-follower-once.timer}"

HTTP_HOST="${HTTP_HOST:-127.0.0.1}"
HTTP_PORT="${HTTP_PORT:-4100}"
P2P_HOST="${P2P_HOST:-127.0.0.1}"
P2P_PORT="${P2P_PORT:-4700}"

FOLLOW_HTTP_PORT="${FOLLOW_HTTP_PORT:-4101}"
FOLLOW_P2P_PORT="${FOLLOW_P2P_PORT:-4701}"

DATA_A="${DATA_A:-$ROOT/data_a}"
DATA_B="${DATA_B:-$ROOT/data_b}"

NODEA_KEY="${NODEA_KEY:-$ROOT/.secrets/nodeA.key}"
NODEB_KEY="${NODEB_KEY:-$ROOT/.secrets/nodeB.key}"

pass(){ echo "PASS: $*"; }
fail(){ echo "FAIL: $*"; exit 1; }

mkdir -p "$USER_UNIT_DIR"
mkdir -p "$ROOT/.secrets" "$DATA_A" "$DATA_B"

cat > "$USER_UNIT_DIR/$MAIN_UNIT" <<UNIT
[Unit]
Description=VOID Node main
After=default.target

[Service]
Type=simple
WorkingDirectory=$ROOT
Environment=NODE_ENV=dev
Environment=HTTP_HOST=$HTTP_HOST
Environment=HTTP_PORT=$HTTP_PORT
Environment=P2P_HOST=$P2P_HOST
Environment=P2P_PORT=$P2P_PORT
Environment=DATA_DIR=$DATA_A
Environment=NODE_PRIVKEY_PATH=$NODEA_KEY
Environment=PROPOSER_AUTO=1
Environment=VOID_PROPOSER_AUTO=1
Environment=VOID_AUTOPROP=1
Environment=VOID_AUTOPROP_ENABLED=1
Environment=VOID_COMMIT_DIRECT_AUTOPROP=1
Environment=VOID_COMMIT_DIRECT_AUTOPROP_ENABLED=1
Environment=VOID_COMMIT_DIRECT_AUTOPROP_V1=1
Environment=VOID_AUTOPROP_FORCE_OFF=0
Environment=VOID_DISABLE_COMMIT_DIRECT_AUTOPROP=0
Environment=VOID_DISABLE_COMMIT_DIRECT_AUTOPROP_V1=0
Environment=VOID_COMMIT_DIRECT_V2FS_AUTORUN=1
Environment=VOID_DISABLE_COMMIT_DIRECT_V2FS_AUTORUN=0
Environment=VOID_PROPOSER_AUTORESCUE=1
Environment=PROPOSER_TICK_MS=2000
Environment=VOID_PROPOSER_TICK_MS=2000
Environment=VOID_COMMIT_DIRECT_V2FS_EMPTY=0
Environment=VOID_COMMIT_DIRECT_V2FS_AUTO_EMPTY=0
Environment=VOID_COMMIT_DIRECT_V2FS_ALLOW_EMPTY=0
ExecStart=/usr/bin/env npm exec tsx src/index.ts
Restart=always
RestartSec=2

[Install]
WantedBy=default.target
UNIT

cat > "$USER_UNIT_DIR/$FOLLOW_ONCE_SERVICE" <<UNIT
[Unit]
Description=VOID follower pull-once (safe external sync)
After=$MAIN_UNIT

[Service]
Type=oneshot
WorkingDirectory=$ROOT
Environment=NODE_ENV=dev
Environment=HTTP_HOST=$HTTP_HOST
Environment=HTTP_PORT=$FOLLOW_HTTP_PORT
Environment=P2P_HOST=$P2P_HOST
Environment=P2P_PORT=$FOLLOW_P2P_PORT
Environment=DATA_DIR=$DATA_B
Environment=NODE_PRIVKEY_PATH=$NODEB_KEY
Environment=BOOTSTRAP_ADDRS=127.0.0.1:$P2P_PORT
Environment=SRC=http://127.0.0.1:4100
ExecStart=/usr/bin/env npx --yes tsx scripts/follower_once.ts
UNIT

cat > "$USER_UNIT_DIR/$FOLLOW_ONCE_TIMER" <<UNIT
[Unit]
Description=Run VOID follower pull-once every 5 seconds

[Timer]
OnBootSec=10
OnUnitActiveSec=5
Unit=$FOLLOW_ONCE_SERVICE
Persistent=true

[Install]
WantedBy=timers.target
UNIT

echo "=== [3] reload + enable/start ==="
systemctl --user daemon-reload
systemctl --user enable --now "$MAIN_UNIT"
systemctl --user enable --now "$FOLLOW_ONCE_TIMER"

echo "=== [4] verify installed/active units ==="
systemctl --user cat "$MAIN_UNIT" >/dev/null
systemctl --user cat "$FOLLOW_ONCE_SERVICE" >/dev/null
systemctl --user cat "$FOLLOW_ONCE_TIMER" >/dev/null
systemctl --user is-enabled "$MAIN_UNIT" >/dev/null
systemctl --user is-enabled "$FOLLOW_ONCE_TIMER" >/dev/null
systemctl --user is-active "$MAIN_UNIT" >/dev/null
pass "user units installed and started"

echo
echo "=== [5] live status ==="
systemctl --user --no-pager --full status "$MAIN_UNIT" || true
echo
systemctl --user --no-pager --full status "$FOLLOW_ONCE_TIMER" || true

echo
echo "=== [6] next ==="
echo "Preferred public beta path:"
echo "./ops/public-beta-quickstart.sh"
echo "Equivalent:"
echo "make public-beta"
echo
echo "Bounded proof gates:"
echo "make public-beta-preflight   # wallet proof + wallet identity smoke + runner safety"
echo "make wc-wallet-proof          # isolated wallet-specific WC proof only"
echo
echo "Live status:"
echo "make public-beta-status"
echo "./ops/install-path-status.sh"
echo
echo "Manual fallback:"
echo "./ops/first-run-smoke.sh"
echo "./ops/demo-video-proof.sh"
