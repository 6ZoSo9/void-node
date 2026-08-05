#!/usr/bin/env bash
set -Eeuo pipefail
set +H
umask 077

MARKER="VOID_LOCAL_PUBLIC_EARN_GATEWAY_INSTALLER_V1"
ROOT="${VOID_NODE_ROOT:-$HOME/dev/void-node}"
SERVICE_NAME="void-public-earn-gateway-v1.service"
SERVICE_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$SERVICE_DIR/$SERVICE_NAME"
VOID_SEED_UPSTREAM="${VOID_SEED_UPSTREAM:-http://127.0.0.1:4100}"
VOID_EARN_COORDINATOR_UPSTREAM="${VOID_EARN_COORDINATOR_UPSTREAM:-http://127.0.0.1:4100}"
VOID_ADAPTER_HOST="${VOID_ADAPTER_HOST:-127.0.0.1}"
VOID_ADAPTER_PORT="${VOID_ADAPTER_PORT:-4111}"
ENABLE_SERVICE="${ENABLE_SERVICE:-0}"
START_SERVICE="${START_SERVICE:-0}"
CONFIRM="${CONFIRM:-}"
EXPECTED_CONFIRM="activate-loopback-public-earn-gateway-v1"

fail() {
  printf '%s HOLD: %s\n' "$MARKER" "$*" >&2
  exit 1
}

validate_private_http_origin() {
  python3 - "$1" <<'PY'
import ipaddress
import sys
from urllib.parse import urlsplit

raw = sys.argv[1].strip()
try:
    parsed = urlsplit(raw)
except Exception:
    raise SystemExit("invalid origin")
if parsed.scheme != "http" or not parsed.hostname:
    raise SystemExit("origin must use http with a host")
if parsed.username or parsed.password or parsed.query or parsed.fragment:
    raise SystemExit("origin must not contain credentials, query, or fragment")
if parsed.path not in {"", "/"}:
    raise SystemExit("origin must not contain a path")
if any(ch in raw for ch in ("\n", "\r", "\x00", '"')):
    raise SystemExit("origin contains forbidden characters")
host = parsed.hostname.lower()
allowed = host in {"localhost", "127.0.0.1", "::1"} or host.endswith(".ts.net")
try:
    address = ipaddress.ip_address(host)
    allowed = (
        allowed
        or address.is_loopback
        or address.is_private
        or address in ipaddress.ip_network("100.64.0.0/10")
        or address in ipaddress.ip_network("fd7a:115c:a1e0::/48")
    )
except ValueError:
    pass
if not allowed:
    raise SystemExit("plain-http upstream must be loopback, private, or Tailnet")
print(parsed.scheme + "://" + parsed.netloc)
PY
}

case "$ENABLE_SERVICE:$START_SERVICE" in
  0:0|1:0|1:1) ;;
  *) fail "ENABLE_SERVICE and START_SERVICE must be 0/1, and start requires enable" ;;
esac

case "$VOID_ADAPTER_HOST" in
  127.0.0.1) ;;
  *) fail "local Public Earn gateway must bind only to 127.0.0.1" ;;
esac
case "$VOID_ADAPTER_PORT" in
  ''|*[!0-9]*) fail "VOID_ADAPTER_PORT must be an integer" ;;
esac
if [ "$VOID_ADAPTER_PORT" -lt 1024 ] || [ "$VOID_ADAPTER_PORT" -gt 65535 ]; then
  fail "VOID_ADAPTER_PORT must be from 1024 to 65535"
fi

VOID_SEED_UPSTREAM="$(validate_private_http_origin "$VOID_SEED_UPSTREAM")" ||
  fail "invalid VOID_SEED_UPSTREAM"
VOID_EARN_COORDINATOR_UPSTREAM="$(
  validate_private_http_origin "$VOID_EARN_COORDINATOR_UPSTREAM"
)" || fail "invalid VOID_EARN_COORDINATOR_UPSTREAM"

[ -d "$ROOT/.git" ] || fail "repository not found: $ROOT"
[ ! -L "$ROOT" ] || fail "repository root must not be a symlink"
for relative in \
  ops/public/public-seed-adapter-v1.mjs \
  tools/wc-public-coordinator-readiness-v1.mjs
do
  [ -f "$ROOT/$relative" ] || fail "required file missing: $relative"
done

NODE_BIN="$(command -v node 2>/dev/null || true)"
[ -n "$NODE_BIN" ] || fail "Node.js is unavailable"
NODE_MAJOR="$($NODE_BIN -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
[ "$NODE_MAJOR" = "22" ] || fail "Node.js 22 is required"
NODE_BIN="$(readlink -f "$NODE_BIN")"

if [ "$ENABLE_SERVICE" = "1" ] || [ "$START_SERVICE" = "1" ]; then
  [ "$CONFIRM" = "$EXPECTED_CONFIRM" ] ||
    fail "exact confirmation required: $EXPECTED_CONFIRM"
fi

mkdir -p "$SERVICE_DIR"
cat >"$SERVICE_FILE" <<UNIT
[Unit]
Description=VOID loopback Public Earn gateway v1
After=void-node-live.service
Wants=void-node-live.service

[Service]
Type=simple
WorkingDirectory=$ROOT
Environment="VOID_SEED_UPSTREAM=$VOID_SEED_UPSTREAM"
Environment="VOID_EARN_COORDINATOR_UPSTREAM=$VOID_EARN_COORDINATOR_UPSTREAM"
Environment="VOID_ADAPTER_HOST=$VOID_ADAPTER_HOST"
Environment="VOID_ADAPTER_PORT=$VOID_ADAPTER_PORT"
ExecStart=$NODE_BIN $ROOT/ops/public/public-seed-adapter-v1.mjs
Restart=on-failure
RestartSec=3
KillMode=control-group
TimeoutStopSec=10
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only
LockPersonality=true
RestrictSUIDSGID=true
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6

[Install]
WantedBy=default.target
UNIT
chmod 600 "$SERVICE_FILE"
systemctl --user daemon-reload

printf '%s\n' "$MARKER"
printf 'service_file=%s\n' "$SERVICE_FILE"
printf 'service_enabled_requested=%s\n' "$ENABLE_SERVICE"
printf 'service_started_requested=%s\n' "$START_SERVICE"
printf 'adapter_base=http://127.0.0.1:%s\n' "$VOID_ADAPTER_PORT"
printf 'earn_coordinator_bound=true\n'
printf 'wallet_or_signer_access=false\n'
printf 'ticket_issuance=false\n'
printf 'wc_write=false\n'
printf 'fund_movement=false\n'

if [ "$ENABLE_SERVICE" = "0" ]; then
  printf '%s INSTALLED_DISABLED\n' "$MARKER"
  exit 0
fi

if [ "$START_SERVICE" = "1" ]; then
  TMP="$(mktemp -d "${TMPDIR:-/tmp}/void-local-public-earn-gateway-v1.XXXXXXXX")"
  cleanup() { rm -rf "$TMP"; }
  trap cleanup EXIT INT TERM

  curl -fsS --connect-timeout 3 --max-time 10 \
    -H 'accept: application/json' \
    "$VOID_EARN_COORDINATOR_UPSTREAM/health" >"$TMP/health.json" ||
    fail "earn coordinator health is unavailable"
  curl -fsS --connect-timeout 3 --max-time 10 \
    -H 'accept: application/json' \
    "$VOID_EARN_COORDINATOR_UPSTREAM/wc/public-earning-pilot-v1/status" \
    >"$TMP/status.json" || fail "earn coordinator status is unavailable"

  python3 - "$TMP/health.json" "$TMP/status.json" <<'PY' ||
    fail "earn coordinator is not ready for bounded public gateway activation"
import json
import re
import sys

health = json.load(open(sys.argv[1], encoding="utf-8"))
status = json.load(open(sys.argv[2], encoding="utf-8"))
node_id = str(health.get("nodeId") or health.get("node_id") or "").lower()
assert health.get("ok") is True, health
assert re.fullmatch(r"[0-9a-f]{32}", node_id), health
assert status.get("ok") is True, status
assert status.get("marker") == "VOID_WC_PUBLIC_EARNING_PILOT_V1", status
assert status.get("coordinator_enabled") is True, status
assert status.get("executor_enabled") is False, status
assert int(status.get("fixed_award_wc", -1)) == 3, status
claim = status.get("public_claim") or {}
assert claim.get("enabled") is True, status
assert claim.get("available") is True, status
assert claim.get("server_selected_work") is True, status
assert claim.get("participant_selected_dataset") is False, status
assert claim.get("participant_selected_input_hash") is False, status
assert claim.get("participant_selected_award") is False, status
assert claim.get("money_movement") is False, status
PY
fi

systemctl --user enable "$SERVICE_NAME"

if [ "$START_SERVICE" = "0" ]; then
  printf '%s ENABLED_STOPPED\n' "$MARKER"
  exit 0
fi

systemctl --user restart "$SERVICE_NAME"

BASE="http://127.0.0.1:$VOID_ADAPTER_PORT"
READY=0
for _ in $(seq 1 30); do
  if curl -fsS --connect-timeout 2 --max-time 5 \
    "$BASE/__void/public-earn-gateway-v1/status.json" \
    >"$TMP/gateway.json" 2>/dev/null; then
    if python3 - "$TMP/gateway.json" <<'PY' >/dev/null 2>&1
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
assert j.get("ok") is True, j
assert j.get("marker") == "VOID_PUBLIC_EARN_GATEWAY_V1", j
assert j.get("enabled") is True, j
PY
    then
      READY=1
      break
    fi
  fi
  sleep 1
done
[ "$READY" = "1" ] || fail "gateway service did not become ready"

"$NODE_BIN" "$ROOT/tools/wc-public-coordinator-readiness-v1.mjs" \
  --base "$BASE" \
  --require-ready

systemctl --user show "$SERVICE_NAME" \
  -p ActiveState -p SubState -p UnitFileState -p FragmentPath
printf '%s ACTIVATION_GREEN\n' "$MARKER"
