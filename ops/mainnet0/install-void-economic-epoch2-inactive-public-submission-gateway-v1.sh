#!/usr/bin/env bash
set -euo pipefail

if [[ "\${BASH_SOURCE[0]}" != "\$0" ]]; then
  echo "run this installer with bash; do not source it" >&2
  return 2
fi

MARKER="VOID_ECONOMIC_EPOCH2_INACTIVE_PUBLIC_SUBMISSION_GATEWAY_INSTALL_V1"
ROOT="\${VOID_NODE_ROOT:-\$HOME/dev/void-node}"
EXPECTED_HOST="\${VOID_EPOCH2_GATEWAY_HOSTNAME:-zoso-Precision-Tower-7810}"
UNIT_NAME="void-economic-epoch2-public-submission-gateway-v1.service"
UNIT_DIR="\$HOME/.config/systemd/user"
UNIT_PATH="\$UNIT_DIR/\$UNIT_NAME"
STATE_DIR="\$HOME/.local/state/void-economic-epoch2-public-submission-gateway-v1"
REPLAY_ROOT="\$STATE_DIR/replay-v1"
STATUS_PATH="\$STATE_DIR/status-v1.json"
ENABLE_SERVICE="\${ENABLE_SERVICE:-1}"
START_SERVICE="\${START_SERVICE:-0}"

echo "\$MARKER"

test "\$(hostname)" = "\$EXPECTED_HOST"
test -d "\$ROOT/.git"
cd "\$ROOT"
test "\$(git branch --show-current)" = "main"
test -z "\$(git status --porcelain=v1 --untracked-files=all)"

node_bin="\$(command -v node)"
test -n "\$node_bin"
node_bin="\$(readlink -f "\$node_bin")"
test -x "\$node_bin"

for value in "\$ROOT" "\$node_bin" "\$STATE_DIR" "\$REPLAY_ROOT" "\$STATUS_PATH"; do
  case "\$value" in
    *[[:space:]]*) echo "path contains whitespace: \$value" >&2; exit 2 ;;
  esac
done

mkdir -p "\$UNIT_DIR" "\$STATE_DIR" "\$REPLAY_ROOT"
chmod 0700 "\$STATE_DIR" "\$REPLAY_ROOT"

runner="\$ROOT/scripts/run_void_economic_epoch2_inactive_public_submission_gateway_v1.mjs"
test -f "\$runner"
test ! -L "\$runner"

tmp="\$(mktemp "\$UNIT_DIR/.\${UNIT_NAME}.XXXXXX")"
cleanup() {
  rm -f "\$tmp"
}
trap cleanup EXIT INT TERM

cat >"\$tmp" <<UNIT
[Unit]
Description=VOID Epoch-2 inactive public submission gateway replay binding v1
After=default.target

[Service]
Type=simple
WorkingDirectory=\$ROOT
Environment=VOID_EPOCH2_REPLAY_ROOT=\$REPLAY_ROOT
Environment=VOID_EPOCH2_STATUS_PATH=\$STATUS_PATH
ExecStart=\$node_bin \$runner
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=false
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=\$STATE_DIR
RestrictAddressFamilies=AF_UNIX
RestrictSUIDSGID=true
LockPersonality=true
MemoryDenyWriteExecute=false
UMask=0077
KillMode=mixed
TimeoutStopSec=10

[Install]
WantedBy=default.target
UNIT

install -m 0644 "\$tmp" "\$UNIT_PATH"
rm -f "\$tmp"
trap - EXIT INT TERM

systemctl --user daemon-reload

case "\$ENABLE_SERVICE" in
  0) ;;
  1) systemctl --user enable "\$UNIT_NAME" >/dev/null ;;
  *) echo "ENABLE_SERVICE must be 0 or 1" >&2; exit 2 ;;
esac

case "\$START_SERVICE" in
  0) ;;
  1) systemctl --user restart "\$UNIT_NAME" ;;
  *) echo "START_SERVICE must be 0 or 1" >&2; exit 2 ;;
esac

echo "hostname=\$(hostname)"
echo "node_bin=\$node_bin"
echo "unit=\$UNIT_PATH"
echo "state_dir=\$STATE_DIR"
echo "replay_root=\$REPLAY_ROOT"
echo "status_path=\$STATUS_PATH"
echo "enable_service=\$ENABLE_SERVICE"
echo "start_service=\$START_SERVICE"
echo "runtime_route_active=false"
echo "public_submission_open=false"
echo "authoritative_chain2050_write=false"
echo "funds_movement=false"
echo "\${MARKER}_GREEN"
