#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MARKER="VOID_PUBLIC_SEED_NAMED_TUNNEL_INSTALLER_V1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
PACKET_DIR="${1:-${VOID_PUBLIC_SEED_PACKET_DIR:-}}"
START_SERVICES="${VOID_PUBLIC_SEED_START_SERVICES:-0}"
ENABLE_AUTOSTART="${VOID_PUBLIC_SEED_ENABLE_AUTOSTART:-0}"
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
GATEWAY_UNIT="void-public-seed-gateway-v1.service"
TUNNEL_UNIT="void-public-seed-named-tunnel-v1.service"
COMPAT_NAME="99-void-public-seed-checkpoint-environment.conf"
COMPAT_DIR="$SYSTEMD_USER_DIR/$GATEWAY_UNIT.d"
COMPAT_PATH="$COMPAT_DIR/$COMPAT_NAME"

say() { printf '%s\n' "$*"; }
hold() { say "HOLD: $*" >&2; exit 1; }

case "$START_SERVICES" in
  0|1) ;;
  *) hold "VOID_PUBLIC_SEED_START_SERVICES must be 0 or 1" ;;
esac
case "$ENABLE_AUTOSTART" in
  0|1) ;;
  *) hold "VOID_PUBLIC_SEED_ENABLE_AUTOSTART must be 0 or 1" ;;
esac
if test "$START_SERVICES" = 0 && test "$ENABLE_AUTOSTART" = 1; then
  hold "autostart cannot be enabled before a successful live activation"
fi

test "$(id -u)" != 0 || hold "install as the intended non-root service user"
test -n "$PACKET_DIR" || hold "packet directory is required"
test -d "$PACKET_DIR" && test ! -L "$PACKET_DIR" || hold "packet directory must be one real directory"
PACKET_DIR="$(cd "$PACKET_DIR" && pwd -P)"

for command in node install systemctl curl mktemp rm mkdir grep; do
  command -v "$command" >/dev/null 2>&1 || hold "required command not found: $command"
done

if test "$START_SERVICES" = 0; then
  for unit in "$GATEWAY_UNIT" "$TUNNEL_UNIT"; do
    if systemctl --user is-active --quiet "$unit" 2>/dev/null; then
      hold "cannot inert-stage while $unit is active"
    fi
  done
fi

cd "$ROOT"
node scripts/verify_void_public_seed_named_tunnel_packet_v1.mjs --packet "$PACKET_DIR"
node scripts/verify_void_public_checkpoint_named_tunnel_packet_v1.mjs --packet "$PACKET_DIR"

COMPAT_TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$COMPAT_TEMP_DIR"' EXIT
COMPAT_TEMP="$COMPAT_TEMP_DIR/$COMPAT_NAME"
node scripts/render_void_public_checkpoint_environment_compat_dropin_v1.mjs \
  --packet "$PACKET_DIR" \
  --output "$COMPAT_TEMP"

COMPAT_RENDERED=0
if test -f "$COMPAT_TEMP"; then
  COMPAT_RENDERED=1
fi

CURRENT_UNSET="$(systemctl --user show "$GATEWAY_UNIT" -p UnsetEnvironment --value 2>/dev/null || true)"
if grep -Eq 'VOID_PUBLIC_SEED_CHECKPOINT_(ROOT|ID|MANIFEST_SHA256)' <<<"$CURRENT_UNSET"; then
  test "$COMPAT_RENDERED" = 1 || hold "loaded gateway UnsetEnvironment removes checkpoint pins but packet has no compatibility binding"
fi

mkdir -p "$SYSTEMD_USER_DIR"
install -m 600 -- "$PACKET_DIR/$GATEWAY_UNIT" "$SYSTEMD_USER_DIR/$GATEWAY_UNIT"
install -m 600 -- "$PACKET_DIR/$TUNNEL_UNIT" "$SYSTEMD_USER_DIR/$TUNNEL_UNIT"
if test "$COMPAT_RENDERED" = 1; then
  mkdir -p "$COMPAT_DIR"
  install -m 600 -- "$COMPAT_TEMP" "$COMPAT_PATH"
else
  rm -f -- "$COMPAT_PATH"
fi
systemctl --user daemon-reload

if test "$COMPAT_RENDERED" = 1; then
  EFFECTIVE_UNSET="$(systemctl --user show "$GATEWAY_UNIT" -p UnsetEnvironment --value 2>/dev/null || true)"
  if grep -Eq 'VOID_PUBLIC_SEED_CHECKPOINT_(ROOT|ID|MANIFEST_SHA256)' <<<"$EFFECTIVE_UNSET"; then
    hold "checkpoint compatibility drop-in did not release checkpoint UnsetEnvironment names"
  fi
  EFFECTIVE_ENV="$(systemctl --user show "$GATEWAY_UNIT" -p Environment --value 2>/dev/null || true)"
  for checkpoint_name in \
    VOID_PUBLIC_SEED_CHECKPOINT_ROOT \
    VOID_PUBLIC_SEED_CHECKPOINT_ID \
    VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256
  do
    grep -q "$checkpoint_name=" <<<"$EFFECTIVE_ENV" \
      || hold "checkpoint environment $checkpoint_name is absent after daemon-reload"
  done
fi

# Every installation pass first removes durable autostart state. This makes
# START_SERVICES=0 genuinely inert on an inactive host and makes START_SERVICES=1
# a disabled live canary until activation checks have passed. Durable autostart
# is committed only at the end of the successful activation path below.
systemctl --user disable "$GATEWAY_UNIT" "$TUNNEL_UNIT" >/dev/null
for unit in "$GATEWAY_UNIT" "$TUNNEL_UNIT"; do
  if systemctl --user is-enabled --quiet "$unit" 2>/dev/null; then
    hold "$unit remained enabled after inert staging"
  fi
done

say "$MARKER INSTALLED"
say "packet_dir=$PACKET_DIR"
say "gateway_unit=$SYSTEMD_USER_DIR/$GATEWAY_UNIT"
say "tunnel_unit=$SYSTEMD_USER_DIR/$TUNNEL_UNIT"
say "checkpoint_environment_compat_installed=$([ "$COMPAT_RENDERED" = 1 ] && printf true || printf false)"
say "services_started=false"
say "autostart_enabled=false"

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

  if test "$ENABLE_AUTOSTART" = 1; then
    systemctl --user enable "$GATEWAY_UNIT" "$TUNNEL_UNIT" >/dev/null
    for unit in "$GATEWAY_UNIT" "$TUNNEL_UNIT"; do
      systemctl --user is-enabled --quiet "$unit" || hold "$unit did not become enabled"
    done
    say "autostart_enabled=true"
  else
    say "autostart_enabled=false"
  fi

  say "$MARKER ACTIVATED"
  say "services_started=true"
  say "gateway_loopback_only=true"
  say "private_mutation_routes_exposed=false"
  say "next_step=run_manual_live_qualification_workflow"
else
  say "inert_staging=true"
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
