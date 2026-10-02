#!/usr/bin/env bash
set -Eeuo pipefail
set +H
set +o histexpand 2>/dev/null || true

MARKER="VOID_SITE_BUNDLE_PEER_ENV_PERSISTENCE_V1"
ROOT="${VOID_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
CROSSBOX_SSH_TARGET="${CROSSBOX_SSH_TARGET:-${ALIEN:-}}"
LOCAL_PEER="${LOCAL_PEER:-}"
REMOTE_PEER="${REMOTE_PEER:-}"
LOCAL_READY_BASE="${LOCAL_READY_BASE:-}"
REMOTE_READY_BASE="${REMOTE_READY_BASE:-}"
CONFIRM_SITE_BUNDLE_PEER_ENV_PERSISTENCE="${CONFIRM_SITE_BUNDLE_PEER_ENV_PERSISTENCE:-}"
DROPIN_NAME="${DROPIN_NAME:-97-site-bundle-peers.conf}"
STATE_ROOT="${VOID_SITE_BUNDLE_TRANSACTION_STATE_ROOT:-}"
EXECUTOR="$ROOT/tools/void-site-bundle-peer-env-transaction-executor-v1.mjs"
NODE_BIN="${NODE_BIN:-$(command -v node || true)}"

hold(){
  echo "$MARKER HOLD: $*" >&2
  exit 2
}

valid_ssh_target(){
  local target="$1"
  [[ "$target" =~ ^([A-Za-z0-9][A-Za-z0-9._-]*@)?[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
}

safe_peer(){
  local peer="$1"
  [[ "$peer" =~ ^https?://[A-Za-z0-9][A-Za-z0-9._-]*:(4100|4101|4102)$ ]]
}

safe_ready_base(){
  local base="$1"
  [[ "$base" =~ ^http://127\.0\.0\.1:(4100|4101|4102)$ ]]
}

safe_dropin_name(){
  local name="$1"
  [ "$name" != "." ] &&
  [ "$name" != ".." ] &&
  [[ "$name" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]]
}

[ -n "$CROSSBOX_SSH_TARGET" ] || hold "missing explicit CROSSBOX_SSH_TARGET"
valid_ssh_target "$CROSSBOX_SSH_TARGET" ||
  hold "invalid explicit CROSSBOX_SSH_TARGET"
[ -n "$LOCAL_PEER" ] || hold "missing explicit LOCAL_PEER"
[ -n "$REMOTE_PEER" ] || hold "missing explicit REMOTE_PEER"
safe_peer "$LOCAL_PEER" || hold "unsafe LOCAL_PEER"
safe_peer "$REMOTE_PEER" || hold "unsafe REMOTE_PEER"
[ -n "$LOCAL_READY_BASE" ] || hold "missing explicit LOCAL_READY_BASE"
[ -n "$REMOTE_READY_BASE" ] || hold "missing explicit REMOTE_READY_BASE"
safe_ready_base "$LOCAL_READY_BASE" || hold "unsafe LOCAL_READY_BASE"
safe_ready_base "$REMOTE_READY_BASE" || hold "unsafe REMOTE_READY_BASE"
safe_dropin_name "$DROPIN_NAME" || hold "unsafe DROPIN_NAME"

target_guard="$(printf '%s\n' "$CROSSBOX_SSH_TARGET" "$LOCAL_PEER" "$REMOTE_PEER" | tr '[:upper:]' '[:lower:]')"
case "$target_guard" in
  *100.122.79.39*|*zoso-alienware-aurora-r7.taila47fd.ts.net*|*alienware*)
    hold "retired Alienware target is forbidden"
    ;;
esac

[ "$CONFIRM_SITE_BUNDLE_PEER_ENV_PERSISTENCE" = "applyVoidSiteBundlePeerEnvPersistenceV1" ] ||
  hold "confirmation token required"

[ -n "$NODE_BIN" ] || hold "node executable unavailable"
[ -x "$NODE_BIN" ] || hold "node executable is not executable"
[ -f "$EXECUTOR" ] || hold "reviewed site-bundle transaction executor unavailable"

cd "$ROOT" || hold "repository root unavailable"

echo "=== VOID site bundle peer env persistence ==="
echo "marker=$MARKER"
echo "transaction_executor=true"
echo "live_service_unit=void-node-live.service"
echo "explicit_crossbox_target=true"
echo "explicit_local_ready_base=$LOCAL_READY_BASE"
echo "explicit_remote_ready_base=$REMOTE_READY_BASE"
echo "two_participant_prepare_before_publish=true"
echo "durable_publish_intent_before_side_effect=true"
echo "durable_restore_intent_before_side_effect=true"
echo "observation_first_crash_recovery=true"
echo "postcommit_site_bundle_functionality_verified=false"
echo "validator_publication=false"
echo "git_tag_or_push=false"
echo "credential_or_key_access=false"
echo "transaction_broadcast=false"
echo "funds_movement=false"
echo

args=(
  "$EXECUTOR"
  --remote "$CROSSBOX_SSH_TARGET"
  --local-peer "$LOCAL_PEER"
  --remote-peer "$REMOTE_PEER"
  --local-ready-base "$LOCAL_READY_BASE"
  --remote-ready-base "$REMOTE_READY_BASE"
  --dropin-name "$DROPIN_NAME"
  --confirmation "$CONFIRM_SITE_BUNDLE_PEER_ENV_PERSISTENCE"
)
if [ -n "$STATE_ROOT" ]; then
  args+=(--state-root "$STATE_ROOT")
fi

echo "=== execute or recover reviewed two-box mutation transaction ==="
set +e
"$NODE_BIN" "${args[@]}"
transaction_rc=$?
set -e

case "$transaction_rc" in
  0)
    echo "[ok] site-bundle peer transaction committed on both participants"
    echo "next_gate=separate_current-topology_site-bundle_functionality_observation"
    exit 0
    ;;
  3)
    hold "transaction restored exact prestate after failed publication; inspect durable journal before retry"
    ;;
  *)
    hold "transaction is not committed; durable journal/recovery output printed above"
    ;;
esac
