#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MARKER="VOID_PUBLIC_SEED_NAMED_TUNNEL_INSTALLER_V1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
PACKET_DIR="${1:-${VOID_PUBLIC_SEED_PACKET_DIR:-}}"
START_SERVICES="${VOID_PUBLIC_SEED_START_SERVICES:-0}"
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
GATEWAY_UNIT="void-public-seed-gateway-v1.service"
TUNNEL_UNIT="void-public-seed-named-tunnel-v1.service"

say() { printf '%s\n' "$*"; }
hold() { say "HOLD: $*" >&2; exit 1; }

case "$START_SERVICES" in
  0|1) ;;
  *) hold "VOID_PUBLIC_SEED_START_SERVICES must be 0 or 1" ;;
esac

test "$(id -u)" != 0 || hold "install as the intended non-root service user"
test -n "$PACKET_DIR" || hold "packet directory is required"
test -d "$PACKET_DIR" && test ! -L "$PACKET_DIR" || hold "packet directory must be one real directory"
PACKET_DIR="$(cd "$PACKET_DIR" && pwd -P)"

for command in node install systemctl curl; do
  command -v "$command" >/dev/null 2>&1 || hold "required command not found: $command"
done

cd "$ROOT"
node scripts/verify_void_public_seed_named_tunnel_packet_v1.mjs --packet "$PACKET_DIR"

mkdir -p "$SYSTEMD_USER_DIR"
install -m 600 -- "$PACKET_DIR/$GATEWAY_UNIT" "$SYSTEMD_USER_DIR/$GATEWAY_UNIT"
install -m 600 -- "$PACKET_DIR/$TUNNEL_UNIT" "$SYSTEMD_USER_DIR/$TUNNEL_UNIT"
systemctl --user daemon-reload
systemctl --user enable "$GATEWAY_UNIT" "$TUNNEL_UNIT" >/dev/null

say "$MARKER INSTALLED"
say "packet_dir=$PACKET_DIR"
say "gateway_unit=$SYSTEMD_USER_DIR/$GATEWAY_UNIT"
say "tunnel_unit=$SYSTEMD_USER_DIR/$TUNNEL_UNIT"
say "services_started=false"

if test "$START_SERVICES" = 1; then
  systemctl --user restart "$GATEWAY_UNIT"
  GATEWAY_GREEN=0
  for _ in $(seq 1 30); do
    if curl -fsS --max-time 3 http://127.0.0.1:4111/__void/ready.json >/tmp/void-public-seed-gateway-ready.json; then
      GATEWAY_GREEN=1
      break
    fi
    systemctl --user is-active --quiet "$GATEWAY_UNIT" || {
      systemctl --user status --no-pager "$GATEWAY_UNIT" >&2 || true
      hold "restricted gateway service exited"
    }
    sleep 1
  done
  test "$GATEWAY_GREEN" = 1 || hold "restricted gateway did not become ready"

  python3 - /tmp/void-public-seed-gateway-ready.json <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as handle:
    body = json.load(handle)
assert body.get("ready") is True, body
assert int(body.get("head")) > 0, body
assert int(body.get("gap")) == 0, body
assert int(body.get("txroot_live")) == 1, body
PY

  HEADERS="$(curl -fsSI --max-time 5 http://127.0.0.1:4111/__void/ready.json)"
  grep -qi '^x-void-public-seed-gateway: v1' <<<"$HEADERS" || hold "gateway identity header missing"
  ADMIN_CODE="$(curl -sS -o /tmp/void-public-seed-admin.json -w '%{http_code}' --max-time 5 http://127.0.0.1:4111/admin)"
  MUTATION_CODE="$(curl -sS -o /tmp/void-public-seed-mutation.json -w '%{http_code}' --max-time 5 -X POST http://127.0.0.1:4111/follower/start)"
  test "$ADMIN_CODE" = 404 || hold "gateway exposed an undocumented route"
  test "$MUTATION_CODE" = 405 || hold "gateway accepted a mutation method"
  grep -q 'route_not_public' /tmp/void-public-seed-admin.json || hold "private-route rejection body mismatch"
  grep -q 'method_not_allowed' /tmp/void-public-seed-mutation.json || hold "mutation rejection body mismatch"

  systemctl --user restart "$TUNNEL_UNIT"
  sleep 3
  systemctl --user is-active --quiet "$TUNNEL_UNIT" || {
    systemctl --user status --no-pager "$TUNNEL_UNIT" >&2 || true
    hold "named tunnel service did not remain active"
  }

  say "$MARKER ACTIVATED"
  say "services_started=true"
  say "gateway_loopback_only=true"
  say "private_mutation_routes_exposed=false"
  say "next_step=run_manual_live_qualification_workflow"
fi

systemctl --user show "$GATEWAY_UNIT" -p UnitFileState -p ActiveState -p SubState
systemctl --user show "$TUNNEL_UNIT" -p UnitFileState -p ActiveState -p SubState
say "credentials_read=false"
say "wallet_authority=false"
say "signer_authority=false"
say "validator_authority=false"
say "treasury_authority=false"
say "work_credit_authority=false"
say "money_movement_authority=false"
