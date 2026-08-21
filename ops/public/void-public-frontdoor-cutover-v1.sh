#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_PUBLIC_FRONTDOOR_CUTOVER_V1"
FRONTDOOR_PORT="${VOID_PUBLIC_FRONTDOOR_PORT:-8083}"
MODE="${1:---status}"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="${VOID_FRONTDOOR_SOURCE_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
SERVER_SRC="$SOURCE_ROOT/ops/public/void-public-frontdoor-v1.mjs"
HOME_SRC="$SOURCE_ROOT/public/void-public-frontdoor-v1/index.html"
INSTALL_DIR="$HOME/.local/lib/void-public-frontdoor-v1"
STATE_DIR="$HOME/.local/state/void-public-frontdoor-v1"
UNIT_DIR="$HOME/.config/systemd/user"
UNIT_PATH="$UNIT_DIR/void-public-frontdoor-v1.service"
PREVIOUS_PORT_PATH="$STATE_DIR/previous-funnel-port"

fail() {
  printf 'HOLD %s: %s\n' "$MARKER" "$*" >&2
  exit 2
}

need() { command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"; }
for cmd in node curl tailscale systemctl sed grep install date; do need "$cmd"; done

[[ -f "$SERVER_SRC" ]] || fail "missing server source: $SERVER_SRC"
[[ -f "$HOME_SRC" ]] || fail "missing home source: $HOME_SRC"
node --check "$SERVER_SRC" >/dev/null

tailscale_dns_name() {
  tailscale status --json | node -e '
    let s=""; process.stdin.on("data",d=>s+=d); process.stdin.on("end",()=>{
      const v=JSON.parse(s); const n=String(v?.Self?.DNSName||"").replace(/\.$/,"");
      if(!n) process.exit(2); process.stdout.write(n);
    });'
}

current_simple_funnel_port() {
  local text count port
  text="$(tailscale funnel status 2>/dev/null)" || fail "cannot read Funnel status"
  count="$(printf '%s\n' "$text" | grep -Ec '\|-- / proxy http://(127\.0\.0\.1|localhost):[0-9]+/?$' || true)"
  [[ "$count" == "1" ]] || {
    printf '%s\n' "$text" >&2
    fail "expected exactly one simple root Funnel proxy target; found $count"
  }
  port="$(printf '%s\n' "$text" | sed -nE 's#.*\|-- / proxy http://(127\.0\.0\.1|localhost):([0-9]+)/?$#\2#p')"
  [[ "$port" =~ ^[0-9]+$ ]] || fail "could not parse current Funnel port"
  printf '%s' "$port"
}

status() {
  echo "=== $MARKER status ==="
  echo "hostname=$(hostname)"
  echo "tailscale_dns=$(tailscale_dns_name)"
  echo "--- funnel ---"
  tailscale funnel status || true
  echo "--- frontdoor service ---"
  systemctl --user --no-pager --full status void-public-frontdoor-v1.service 2>/dev/null | sed -n '1,24p' || true
  echo "--- frontdoor local ---"
  curl -fsS --max-time 3 "http://127.0.0.1:${FRONTDOOR_PORT}/__void/frontdoor/status.json" || true
  echo
}

rollback() {
  [[ -f "$PREVIOUS_PORT_PATH" ]] || fail "no saved previous Funnel port"
  local previous
  previous="$(cat "$PREVIOUS_PORT_PATH")"
  [[ "$previous" =~ ^[0-9]+$ ]] || fail "saved previous Funnel port invalid"
  echo "restoring_funnel=http://127.0.0.1:${previous}"
  tailscale funnel --https=443 --bg --yes "http://127.0.0.1:${previous}"
  sleep 2
  tailscale funnel status
  systemctl --user disable --now void-public-frontdoor-v1.service >/dev/null 2>&1 || true
  echo "${MARKER}_ROLLBACK_GREEN"
}

apply() {
  local previous_port dns timestamp
  previous_port="$(current_simple_funnel_port)"
  [[ "$previous_port" != "$FRONTDOOR_PORT" ]] || fail "Funnel already targets frontdoor port ${FRONTDOOR_PORT}"
  [[ "$previous_port" != "0" ]] || fail "invalid previous Funnel port"

  echo "previous_funnel_port=$previous_port"
  echo "frontdoor_port=$FRONTDOOR_PORT"
  echo "node_service_restart=false"
  echo "composition_gateway_restart=false"

  curl -fsS --max-time 5 "http://127.0.0.1:${previous_port}/" -o /dev/null \
    || fail "current Funnel backend is not healthy on 127.0.0.1:${previous_port}"

  mkdir -p "$INSTALL_DIR" "$STATE_DIR" "$UNIT_DIR"
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  tailscale funnel status > "$STATE_DIR/funnel-status-before-${timestamp}.txt"
  tailscale funnel status --json > "$STATE_DIR/funnel-status-before-${timestamp}.json"
  printf '%s\n' "$previous_port" > "$PREVIOUS_PORT_PATH"

  install -m 0644 "$HOME_SRC" "$INSTALL_DIR/index.html"
  install -m 0755 "$SERVER_SRC" "$INSTALL_DIR/frontdoor.mjs"

  cat > "$UNIT_PATH" <<EOF
[Unit]
Description=VOID public frontdoor v1
After=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/env node $INSTALL_DIR/frontdoor.mjs
Environment=VOID_PUBLIC_FRONTDOOR_HOME=$INSTALL_DIR/index.html
Environment=VOID_PUBLIC_FRONTDOOR_BIND=127.0.0.1
Environment=VOID_PUBLIC_FRONTDOOR_PORT=$FRONTDOOR_PORT
Environment=VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT=$previous_port
Restart=on-failure
RestartSec=2
NoNewPrivileges=true
PrivateTmp=true
RestrictSUIDSGID=true
LockPersonality=true

[Install]
WantedBy=default.target
EOF

  systemctl --user daemon-reload
  systemctl --user enable --now void-public-frontdoor-v1.service

  for _ in 1 2 3 4 5 6 7 8 9 10; do
    curl -fsS --max-time 2 "http://127.0.0.1:${FRONTDOOR_PORT}/__void/frontdoor/status.json" >/dev/null 2>&1 && break
    sleep 1
  done

  curl -fsS --max-time 3 "http://127.0.0.1:${FRONTDOOR_PORT}/" | grep -Fq 'VOID_PUBLIC_FRONTDOOR_V1' \
    || fail "frontdoor root marker missing before Funnel cutover"
  curl -fsS --max-time 5 "http://127.0.0.1:${FRONTDOOR_PORT}/app/" -o /dev/null \
    || fail "frontdoor passthrough to /app/ failed before Funnel cutover"

  echo "switching_funnel=http://127.0.0.1:${FRONTDOOR_PORT}"
  if ! tailscale funnel --https=443 --bg --yes "http://127.0.0.1:${FRONTDOOR_PORT}"; then
    rollback
    fail "Funnel cutover command failed; rollback attempted"
  fi

  dns="$(tailscale_dns_name)"
  if ! curl -fsS --max-time 15 "https://${dns}/" | grep -Fq 'VOID_PUBLIC_FRONTDOOR_V1'; then
    rollback
    fail "public root verification failed; rollback completed"
  fi
  if ! curl -fsS --max-time 15 "https://${dns}/app/" -o /dev/null; then
    rollback
    fail "public /app/ passthrough verification failed; rollback completed"
  fi

  echo "${MARKER}_GREEN"
  echo "public_url=https://${dns}/"
  echo "previous_funnel_port=${previous_port}"
  echo "frontdoor_port=${FRONTDOOR_PORT}"
  echo "node_service_restart=false"
  echo "src_index_changed=false"
}

case "$MODE" in
  --status) status ;;
  --check)
    current_simple_funnel_port >/dev/null
    curl -fsS --max-time 5 "http://127.0.0.1:$(current_simple_funnel_port)/" -o /dev/null \
      || fail "current Funnel backend unavailable"
    echo "${MARKER}_CHECK_GREEN"
    ;;
  --apply) apply ;;
  --rollback) rollback ;;
  *) fail "usage: $0 [--status|--check|--apply|--rollback]" ;;
esac
