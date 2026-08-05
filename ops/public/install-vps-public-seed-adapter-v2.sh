#!/usr/bin/env bash
set -euo pipefail
umask 077

ROOT="${VOID_NODE_ROOT:-$HOME/dev/void-node}"
SERVICE_DIR="$HOME/.config/systemd/user"
SERVICE="$SERVICE_DIR/void-vps-public-seed-adapter.service"

VOID_SEED_UPSTREAM="${VOID_SEED_UPSTREAM:-http://100.122.79.39:4100}"
VOID_EARN_COORDINATOR_UPSTREAM="${VOID_EARN_COORDINATOR_UPSTREAM:-}"
VOID_ADAPTER_HOST="${VOID_ADAPTER_HOST:-0.0.0.0}"
VOID_ADAPTER_PORT="${VOID_ADAPTER_PORT:-8080}"
START_SERVICE="${START_SERVICE:-0}"

validate_http_origin() {
  python3 - "$1" "$2" <<'PY'
import sys
from urllib.parse import urlsplit

raw = sys.argv[1].strip()
allow_empty = sys.argv[2] == "1"
if not raw and allow_empty:
    print("")
    raise SystemExit(0)
try:
    parsed = urlsplit(raw)
except Exception:
    raise SystemExit("invalid upstream origin")
if parsed.scheme != "http" or not parsed.hostname:
    raise SystemExit("upstream origin must use http with a host")
if parsed.username or parsed.password or parsed.query or parsed.fragment:
    raise SystemExit("upstream origin must not contain credentials, query, or fragment")
if parsed.path not in {"", "/"}:
    raise SystemExit("upstream origin must not contain a path")
if "\n" in raw or "\r" in raw or "\x00" in raw:
    raise SystemExit("upstream origin contains forbidden control characters")
print(parsed.scheme + "://" + parsed.netloc)
PY
}

VOID_SEED_UPSTREAM="$(validate_http_origin "$VOID_SEED_UPSTREAM" 0)"
VOID_EARN_COORDINATOR_UPSTREAM="$(
  validate_http_origin "$VOID_EARN_COORDINATOR_UPSTREAM" 1
)"

case "$VOID_ADAPTER_HOST" in
  *$'\n'*|*$'\r'*|'')
    echo "invalid VOID_ADAPTER_HOST" >&2
    exit 1
    ;;
esac
case "$VOID_ADAPTER_PORT" in
  ''|*[!0-9]*)
    echo "invalid VOID_ADAPTER_PORT" >&2
    exit 1
    ;;
esac
if [ "$VOID_ADAPTER_PORT" -lt 1 ] || [ "$VOID_ADAPTER_PORT" -gt 65535 ]; then
  echo "invalid VOID_ADAPTER_PORT" >&2
  exit 1
fi

mkdir -p "$SERVICE_DIR"

cat > "$SERVICE" <<UNIT
[Unit]
Description=VOID VPS public seed adapter v2
After=default.target

[Service]
Type=simple
WorkingDirectory=$ROOT
Environment="VOID_SEED_UPSTREAM=$VOID_SEED_UPSTREAM"
Environment="VOID_EARN_COORDINATOR_UPSTREAM=$VOID_EARN_COORDINATOR_UPSTREAM"
Environment="VOID_ADAPTER_HOST=$VOID_ADAPTER_HOST"
Environment="VOID_ADAPTER_PORT=$VOID_ADAPTER_PORT"
ExecStart=$ROOT/ops/public/run-public-seed-adapter-v1.sh
Restart=always
RestartSec=5
KillMode=control-group
TimeoutStopSec=10

[Install]
WantedBy=default.target
UNIT

chmod 600 "$SERVICE"
systemctl --user daemon-reload
systemctl --user enable void-vps-public-seed-adapter.service

if [ "$START_SERVICE" = "1" ]; then
  systemctl --user restart void-vps-public-seed-adapter.service
fi

echo "installed $SERVICE"
systemctl --user show void-vps-public-seed-adapter.service -p UnitFileState -p FragmentPath
