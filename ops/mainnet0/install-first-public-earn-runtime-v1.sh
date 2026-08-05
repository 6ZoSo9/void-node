#!/usr/bin/env bash
set -Eeuo pipefail
set +H
umask 077

MARKER="VOID_FIRST_PUBLIC_EARN_RUNTIME_ACTIVATION_V1"
ROOT="${VOID_NODE_ROOT:-$HOME/dev/void-node}"
EXPECTED_HOST="${VOID_EXPECTED_HOST:-zoso-Precision-Tower-7810}"
NODE_SERVICE="${VOID_NODE_SERVICE:-void-node-live.service}"
COMPOSITION_SERVICE="void-public-earn-coordinator-composition-v1.service"
GATEWAY_SERVICE="void-public-earn-gateway-v1.service"
SERVICE_DIR="$HOME/.config/systemd/user"
NODE_DROPIN_DIR="$SERVICE_DIR/$NODE_SERVICE.d"
NODE_DROPIN="$NODE_DROPIN_DIR/60-first-public-ticket-claim-v1.conf"
COMPOSITION_UNIT="$SERVICE_DIR/$COMPOSITION_SERVICE"
GATEWAY_UNIT="$SERVICE_DIR/$GATEWAY_SERVICE"
PRIVATE_NODE_BASE="${VOID_PRIVATE_NODE_BASE:-http://127.0.0.1:4100}"
COMPOSITION_BASE="${VOID_PUBLIC_EARN_COMPOSITION_BASE:-http://127.0.0.1:4110}"
GATEWAY_BASE="${VOID_PUBLIC_EARN_GATEWAY_BASE:-http://127.0.0.1:4111}"
DATASET_ID="void-public-earn-first-work-v1"
DATASET_SHA256="c12a7a4aec535398d3cb9b3dd7a19894f52daf8a2bf1c11019f81a1f0a0c38ea"
DATASET_FILE="$ROOT/fixtures/public-earning/void-public-earn-first-work-v1.json"
COMPOSITION_PROGRAM="$ROOT/ops/public/public-earn-coordinator-composition-v1.mjs"
GATEWAY_INSTALLER="$ROOT/ops/public/install-local-public-earn-gateway-v1.sh"
READINESS_TOOL="$ROOT/tools/wc-public-coordinator-readiness-v1.mjs"
APPLY="${APPLY:-0}"
CONFIRM="${CONFIRM:-}"
EXPECTED_CONFIRM="activate-first-public-earn-runtime-v1"

SUCCESS=0
CHANGED=0
BACKUP_ROOT=""
NODE_WAS_ACTIVE=0
COMPOSITION_WAS_ACTIVE=0
COMPOSITION_WAS_ENABLED=0
GATEWAY_WAS_ACTIVE=0
GATEWAY_WAS_ENABLED=0

fail() {
  printf '%s HOLD: %s\n' "$MARKER" "$*" >&2
  exit 1
}

need() {
  command -v "$1" >/dev/null 2>&1 || fail "required command missing: $1"
}

is_active() {
  systemctl --user is-active --quiet "$1"
}

is_enabled() {
  systemctl --user is-enabled --quiet "$1" 2>/dev/null
}

restore_file() {
  local destination="$1"
  local backup="$2"
  local existed="$3"
  if [ "$existed" = "1" ]; then
    mkdir -p "$(dirname "$destination")"
    cp -- "$backup" "$destination"
    chmod 600 "$destination"
  else
    rm -f -- "$destination"
  fi
}

rollback() {
  if [ "$SUCCESS" = "1" ] || [ "$CHANGED" = "0" ]; then
    return 0
  fi

  set +e
  printf '%s ROLLBACK_BEGIN\n' "$MARKER" >&2
  systemctl --user disable --now "$GATEWAY_SERVICE" >/dev/null 2>&1 || true
  systemctl --user disable --now "$COMPOSITION_SERVICE" >/dev/null 2>&1 || true

  restore_file \
    "$NODE_DROPIN" \
    "$BACKUP_ROOT/node-dropin" \
    "$(cat "$BACKUP_ROOT/node-dropin.existed" 2>/dev/null || echo 0)"
  restore_file \
    "$COMPOSITION_UNIT" \
    "$BACKUP_ROOT/composition-unit" \
    "$(cat "$BACKUP_ROOT/composition-unit.existed" 2>/dev/null || echo 0)"
  restore_file \
    "$GATEWAY_UNIT" \
    "$BACKUP_ROOT/gateway-unit" \
    "$(cat "$BACKUP_ROOT/gateway-unit.existed" 2>/dev/null || echo 0)"

  systemctl --user daemon-reload >/dev/null 2>&1 || true
  if [ "$NODE_WAS_ACTIVE" = "1" ]; then
    systemctl --user restart "$NODE_SERVICE" >/dev/null 2>&1 || true
  fi

  if [ "$COMPOSITION_WAS_ENABLED" = "1" ]; then
    systemctl --user enable "$COMPOSITION_SERVICE" >/dev/null 2>&1 || true
  fi
  if [ "$COMPOSITION_WAS_ACTIVE" = "1" ]; then
    systemctl --user restart "$COMPOSITION_SERVICE" >/dev/null 2>&1 || true
  fi
  if [ "$GATEWAY_WAS_ENABLED" = "1" ]; then
    systemctl --user enable "$GATEWAY_SERVICE" >/dev/null 2>&1 || true
  fi
  if [ "$GATEWAY_WAS_ACTIVE" = "1" ]; then
    systemctl --user restart "$GATEWAY_SERVICE" >/dev/null 2>&1 || true
  fi
  printf '%s ROLLBACK_COMPLETE\n' "$MARKER" >&2
  return 0
}

TMP=""
finish() {
  local rc=$?
  trap - EXIT INT TERM
  if [ "$SUCCESS" != "1" ] && [ "$CHANGED" = "1" ]; then
    rollback || true
  fi
  if [ -n "${TMP:-}" ]; then
    rm -rf -- "$TMP"
  fi
  exit "$rc"
}
trap finish EXIT INT TERM

for command in awk bash cat chmod cp curl git grep head hostname mkdir mktemp node python3 readlink rm seq sha256sum sleep stat systemctl; do
  need "$command"
done

case "$APPLY" in
  0|1) ;;
  *) fail "APPLY must be 0 or 1" ;;
esac

[ "$(hostname)" = "$EXPECTED_HOST" ] ||
  fail "expected host $EXPECTED_HOST; actual host $(hostname)"
[ -d "$ROOT/.git" ] || fail "repository not found: $ROOT"
[ ! -L "$ROOT" ] || fail "repository root must not be a symlink"
[ "$(git -C "$ROOT" branch --show-current)" = "main" ] ||
  fail "repository must be on main"
[ -z "$(git -C "$ROOT" status --porcelain=v1 --untracked-files=normal)" ] ||
  fail "repository must be clean"

for required in \
  "$DATASET_FILE" \
  "$COMPOSITION_PROGRAM" \
  "$GATEWAY_INSTALLER" \
  "$READINESS_TOOL"
do
  [ -f "$required" ] || fail "required file missing: $required"
  [ ! -L "$required" ] || fail "required file must not be a symlink: $required"
done

[ -x "$GATEWAY_INSTALLER" ] || fail "gateway installer is not executable"
[ "$(sha256sum "$DATASET_FILE" | awk '{print $1}')" = "$DATASET_SHA256" ] ||
  fail "first public work packet SHA-256 mismatch"

NODE_BIN="$(command -v node)"
NODE_MAJOR="$("$NODE_BIN" -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
[ "$NODE_MAJOR" = "22" ] || fail "Node.js 22 is required"
NODE_BIN="$(readlink -f "$NODE_BIN")"

case "$PRIVATE_NODE_BASE:$COMPOSITION_BASE:$GATEWAY_BASE" in
  http://127.0.0.1:4100:http://127.0.0.1:4110:http://127.0.0.1:4111) ;;
  *)
    fail "v1 activation requires exact loopback topology 4100 -> 4110 -> 4111"
    ;;
esac

printf '%s\n' "$MARKER"
printf 'repo=%s\n' "$ROOT"
printf 'node_service=%s\n' "$NODE_SERVICE"
printf 'private_node_base=%s\n' "$PRIVATE_NODE_BASE"
printf 'composition_base=%s\n' "$COMPOSITION_BASE"
printf 'gateway_base=%s\n' "$GATEWAY_BASE"
printf 'dataset_id=%s\n' "$DATASET_ID"
printf 'dataset_sha256=%s\n' "$DATASET_SHA256"
printf 'fixed_award_wc=3\n'
printf 'apply_requested=%s\n' "$APPLY"
printf 'wallet_or_signer_access=false\n'
printf 'ticket_issuance=false\n'
printf 'wc_write=false\n'
printf 'settlement=false\n'
printf 'validator_mutation=false\n'
printf 'fund_movement=false\n'

TMP="$(mktemp -d "${TMPDIR:-/tmp}/void-first-public-earn-runtime-v1.XXXXXXXX")"

curl -fsS --connect-timeout 3 --max-time 10 \
  "$PRIVATE_NODE_BASE/health" >"$TMP/health.json" ||
  fail "private node health is unavailable"
curl -fsS --connect-timeout 3 --max-time 10 \
  "$PRIVATE_NODE_BASE/__void/ready.json" >"$TMP/ready.json" ||
  fail "private node readiness is unavailable"
curl -fsS --connect-timeout 3 --max-time 10 \
  "$PRIVATE_NODE_BASE/blocks/latest/number2.json" >"$TMP/latest.json" ||
  fail "private node latest block is unavailable"
curl -fsS --connect-timeout 3 --max-time 10 \
  "$PRIVATE_NODE_BASE/p2p/peers" >"$TMP/peers.json" ||
  fail "private node peer status is unavailable"
curl -fsS --connect-timeout 3 --max-time 10 \
  "$PRIVATE_NODE_BASE/wc/public-earning-pilot-v1/status" \
  >"$TMP/coordinator-status.json" ||
  fail "private coordinator status is unavailable"

python3 - \
  "$TMP/health.json" \
  "$TMP/ready.json" \
  "$TMP/latest.json" \
  "$TMP/peers.json" \
  "$TMP/coordinator-status.json" <<'PY' ||
  fail "private node/coordinator preflight is not green"
import json
import re
import sys

health, ready, latest, peers, status = [
    json.load(open(path, encoding="utf-8")) for path in sys.argv[1:]
]
node_id = str(health.get("nodeId") or health.get("node_id") or "").lower()
assert health.get("ok") is True, health
assert re.fullmatch(r"[0-9a-f]{32,64}", node_id), health
assert ready.get("ready") is True, ready
assert int(ready.get("gap", -1)) == 0, ready
assert int(ready.get("txroot_live", 0)) == 1, ready
assert isinstance(ready.get("reasons"), list) and not ready["reasons"], ready
assert int(latest.get("number", -1)) == int(ready.get("head", -2)), (latest, ready)
assert int(latest.get("number", -1)) == int(ready.get("lastmile_seen", -3)), (latest, ready)
if isinstance(peers, list):
    peer_count = len(peers)
elif isinstance(peers, dict):
    for key in ("connected", "peers", "items", "nodes"):
        if isinstance(peers.get(key), list):
            peer_count = len(peers[key])
            break
    else:
        peer_count = int(peers.get("peer_count", peers.get("count", -1)))
else:
    peer_count = -1
assert peer_count >= 1, peers

assert status.get("ok") is True, status
assert status.get("marker") == "VOID_WC_PUBLIC_EARNING_PILOT_V1", status
assert status.get("coordinator_enabled") is True, status
assert status.get("executor_enabled") is False, status
assert int(status.get("fixed_award_wc", -1)) == 3, status
claim = status.get("public_claim") or {}
assert claim.get("server_selected_work") is True, status
assert claim.get("participant_selected_dataset") is False, status
assert claim.get("participant_selected_input_hash") is False, status
assert claim.get("participant_selected_award") is False, status
assert claim.get("money_movement") is False, status
print("private_node_and_coordinator_preflight=GREEN")
PY

if [ "$APPLY" = "0" ]; then
  printf 'node_dropin=%s\n' "$NODE_DROPIN"
  printf 'composition_unit=%s\n' "$COMPOSITION_UNIT"
  printf 'gateway_unit=%s\n' "$GATEWAY_UNIT"
  printf 'restart_required=%s\n' "$NODE_SERVICE"
  printf 'activation_confirmation=%s\n' "$EXPECTED_CONFIRM"
  printf '%s PLAN_GREEN_NO_MUTATION\n' "$MARKER"
  SUCCESS=1
  exit 0
fi

[ "$CONFIRM" = "$EXPECTED_CONFIRM" ] ||
  fail "exact confirmation required: $EXPECTED_CONFIRM"

if is_active "$NODE_SERVICE"; then NODE_WAS_ACTIVE=1; fi
if is_active "$COMPOSITION_SERVICE"; then COMPOSITION_WAS_ACTIVE=1; fi
if is_enabled "$COMPOSITION_SERVICE"; then COMPOSITION_WAS_ENABLED=1; fi
if is_active "$GATEWAY_SERVICE"; then GATEWAY_WAS_ACTIVE=1; fi
if is_enabled "$GATEWAY_SERVICE"; then GATEWAY_WAS_ENABLED=1; fi
[ "$NODE_WAS_ACTIVE" = "1" ] || fail "$NODE_SERVICE must already be active"

mkdir -p "$HOME/.local/state/void"
chmod 700 "$HOME/.local/state/void"
BACKUP_ROOT="$(mktemp -d "$HOME/.local/state/void/first-public-earn-runtime-v1-backup.XXXXXXXX")"
chmod 700 "$BACKUP_ROOT"

for item in \
  "node-dropin:$NODE_DROPIN" \
  "composition-unit:$COMPOSITION_UNIT" \
  "gateway-unit:$GATEWAY_UNIT"
do
  name="${item%%:*}"
  file="${item#*:}"
  if [ -f "$file" ]; then
    [ ! -L "$file" ] || fail "refusing to replace symlink: $file"
    cp -- "$file" "$BACKUP_ROOT/$name"
    printf '1\n' >"$BACKUP_ROOT/$name.existed"
  else
    : >"$BACKUP_ROOT/$name"
    printf '0\n' >"$BACKUP_ROOT/$name.existed"
  fi
done

mkdir -p "$NODE_DROPIN_DIR" "$SERVICE_DIR"
cat >"$NODE_DROPIN" <<UNIT
[Service]
Environment="VOID_WC_PUBLIC_EARNING_PILOT_ENABLED=1"
Environment="VOID_WC_PUBLIC_EARNING_EXECUTOR_ENABLED=0"
Environment="VOID_WC_PUBLIC_TICKET_CLAIM_ENABLED=1"
Environment="VOID_WC_PUBLIC_TICKET_CLAIM_DATASET_ID=$DATASET_ID"
Environment="VOID_WC_PUBLIC_TICKET_CLAIM_EXPECTED_INPUT_HASH=$DATASET_SHA256"
Environment="VOID_WC_PUBLIC_TICKET_CLAIM_TTL_MS=900000"
Environment="VOID_WC_PUBLIC_TICKET_CLAIM_CLOCK_SKEW_MS=300000"
Environment="VOID_WC_PUBLIC_TICKET_CLAIM_COOLDOWN_MS=900000"
Environment="VOID_WC_PUBLIC_TICKET_CLAIM_MAX_PER_24H=4"
Environment="VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_ACTIVE_CAP=2"
Environment="VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_MAX_PER_24H=24"
UNIT
chmod 600 "$NODE_DROPIN"

cat >"$COMPOSITION_UNIT" <<UNIT
[Unit]
Description=VOID first public earning coordinator composition v1
After=$NODE_SERVICE
Wants=$NODE_SERVICE

[Service]
Type=simple
WorkingDirectory=$ROOT
Environment="VOID_EARN_PRIVATE_COORDINATOR_UPSTREAM=$PRIVATE_NODE_BASE"
Environment="VOID_PUBLIC_EARN_COMPOSITION_HOST=127.0.0.1"
Environment="VOID_PUBLIC_EARN_COMPOSITION_PORT=4110"
Environment="VOID_EARN_PUBLIC_DATASET_ID=$DATASET_ID"
Environment="VOID_EARN_PUBLIC_DATASET_SHA256=$DATASET_SHA256"
Environment="VOID_EARN_PUBLIC_DATASET_FILE=$DATASET_FILE"
ExecStart=$NODE_BIN $COMPOSITION_PROGRAM
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
chmod 600 "$COMPOSITION_UNIT"

CHANGED=1
systemctl --user daemon-reload
systemctl --user enable "$COMPOSITION_SERVICE"
systemctl --user restart "$NODE_SERVICE"

READY=0
for _ in $(seq 1 45); do
  if curl -fsS --connect-timeout 2 --max-time 5 \
    "$PRIVATE_NODE_BASE/__void/ready.json" >"$TMP/ready-after.json" 2>/dev/null &&
     curl -fsS --connect-timeout 2 --max-time 5 \
    "$PRIVATE_NODE_BASE/wc/public-earning-pilot-v1/status" \
    >"$TMP/status-after.json" 2>/dev/null &&
     python3 - "$TMP/ready-after.json" "$TMP/status-after.json" <<'PY' >/dev/null 2>&1
import json, sys
ready = json.load(open(sys.argv[1], encoding="utf-8"))
status = json.load(open(sys.argv[2], encoding="utf-8"))
assert ready.get("ready") is True, ready
assert int(ready.get("gap", -1)) == 0, ready
assert int(ready.get("txroot_live", 0)) == 1, ready
claim = status.get("public_claim") or {}
assert status.get("coordinator_enabled") is True, status
assert status.get("executor_enabled") is False, status
assert claim.get("enabled") is True, status
assert claim.get("available") is True, status
assert claim.get("work_available") is True, status
assert claim.get("server_selected_work") is True, status
assert claim.get("participant_selected_award") is False, status
assert claim.get("money_movement") is False, status
PY
  then
    READY=1
    break
  fi
  sleep 1
done
[ "$READY" = "1" ] || fail "private coordinator did not become public-claim ready"

systemctl --user restart "$COMPOSITION_SERVICE"

COMPOSITION_READY=0
for _ in $(seq 1 30); do
  if curl -fsS --connect-timeout 2 --max-time 5 \
    "$COMPOSITION_BASE/__void/public-earn-coordinator-composition-v1/status.json" \
    >"$TMP/composition.json" 2>/dev/null &&
     curl -fsS --connect-timeout 2 --max-time 5 \
    "$COMPOSITION_BASE/datanet/v1/fetch/$DATASET_ID?who=void-first-public-earn-runtime-v1" \
    >"$TMP/fetched-dataset.json" 2>/dev/null &&
     [ "$(sha256sum "$TMP/fetched-dataset.json" | awk '{print $1}')" = "$DATASET_SHA256" ]; then
    COMPOSITION_READY=1
    break
  fi
  sleep 1
done
[ "$COMPOSITION_READY" = "1" ] || fail "coordinator composition did not become ready"

VOID_NODE_ROOT="$ROOT" \
VOID_SEED_UPSTREAM="$PRIVATE_NODE_BASE" \
VOID_EARN_COORDINATOR_UPSTREAM="$COMPOSITION_BASE" \
VOID_ADAPTER_HOST=127.0.0.1 \
VOID_ADAPTER_PORT=4111 \
ENABLE_SERVICE=1 \
START_SERVICE=1 \
CONFIRM=activate-loopback-public-earn-gateway-v1 \
  "$GATEWAY_INSTALLER"

"$NODE_BIN" "$READINESS_TOOL" \
  --base "$GATEWAY_BASE" \
  --require-ready

curl -fsS --connect-timeout 3 --max-time 10 \
  "$GATEWAY_BASE/datanet/v1/fetch/$DATASET_ID?who=void-first-public-earn-runtime-v1" \
  >"$TMP/gateway-dataset.json"
[ "$(sha256sum "$TMP/gateway-dataset.json" | awk '{print $1}')" = "$DATASET_SHA256" ] ||
  fail "gateway dataset SHA-256 mismatch"

systemctl --user show "$NODE_SERVICE" \
  -p ActiveState -p SubState -p FragmentPath
systemctl --user show "$COMPOSITION_SERVICE" \
  -p ActiveState -p SubState -p UnitFileState -p FragmentPath
systemctl --user show "$GATEWAY_SERVICE" \
  -p ActiveState -p SubState -p UnitFileState -p FragmentPath

SUCCESS=1
printf '%s ACTIVATION_GREEN\n' "$MARKER"
printf 'public_claim_enabled=true\n'
printf 'public_claim_available=true\n'
printf 'server_selected_dataset_id=%s\n' "$DATASET_ID"
printf 'server_selected_expected_input_hash=%s\n' "$DATASET_SHA256"
printf 'gateway_base=%s\n' "$GATEWAY_BASE"
printf 'ticket_issued=false\n'
printf 'wc_written=false\n'
printf 'fund_movement=false\n'
