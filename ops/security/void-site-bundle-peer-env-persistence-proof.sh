#!/usr/bin/env bash
set -Eeuo pipefail
set +H
set +o histexpand 2>/dev/null || true

MARKER="VOID_SITE_BUNDLE_PEER_ENV_PERSISTENCE_V1"
ROOT="${VOID_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ALIEN="${ALIEN:-}"
LOCAL_PEER="${LOCAL_PEER:-}"
REMOTE_PEER="${REMOTE_PEER:-}"
CONFIRM_SITE_BUNDLE_PEER_ENV_PERSISTENCE="${CONFIRM_SITE_BUNDLE_PEER_ENV_PERSISTENCE:-}"
DROPIN_NAME="${DROPIN_NAME:-97-site-bundle-peers.conf}"
STATE_ROOT="${VOID_SITE_BUNDLE_TRANSACTION_STATE_ROOT:-}"
EXECUTOR="$ROOT/tools/void-site-bundle-peer-env-transaction-executor-v1.mjs"
NODE_BIN="${NODE_BIN:-$(command -v node || true)}"

hold(){
  echo "$MARKER HOLD: $*" >&2
  exit 2
}

[ -n "$NODE_BIN" ] || hold "node executable unavailable"
[ -x "$NODE_BIN" ] || hold "node executable is not executable"
[ -f "$EXECUTOR" ] || hold "reviewed site-bundle transaction executor unavailable"

echo "=== VOID site bundle peer env persistence ==="
echo "marker=$MARKER"
echo "transaction_executor=true"
echo "two_participant_prepare_before_publish=true"
echo "durable_publish_intent_before_side_effect=true"
echo "durable_restore_intent_before_side_effect=true"
echo "observation_first_crash_recovery=true"
echo "validator_publication=false"
echo "git_tag_or_push=false"
echo "credential_or_key_access=false"
echo "transaction_broadcast=false"
echo "funds_movement=false"
echo

args=(
  "$EXECUTOR"
  --remote "$ALIEN"
  --local-peer "$LOCAL_PEER"
  --remote-peer "$REMOTE_PEER"
  --dropin-name "$DROPIN_NAME"
  --confirmation "$CONFIRM_SITE_BUNDLE_PEER_ENV_PERSISTENCE"
)
if [ -n "$STATE_ROOT" ]; then
  args+=(--state-root "$STATE_ROOT")
fi

echo "=== [1] execute or recover reviewed two-box mutation transaction ==="
set +e
"$NODE_BIN" "${args[@]}"
transaction_rc=$?
set -e

case "$transaction_rc" in
  0)
    echo "[ok] site-bundle peer transaction committed on both participants"
    ;;
  3)
    hold "transaction restored exact prestate after failed publication; inspect durable journal before retry"
    ;;
  *)
    hold "transaction is not committed; durable journal/recovery output printed above"
    ;;
esac

echo
echo "=== [2] prove site bundle auto-materialization/readiness from committed durable env ==="
FAIL=0
ALIEN="$ALIEN" make void-public-site-bundle-auto-materialize-proof || FAIL=1
ALIEN="$ALIEN" make void-public-site-bundle-peer-readiness-proof || FAIL=1
make void-public-site-bundle-proof || FAIL=1
make mainnet0-status-smoke || FAIL=1
make mainnet0-crossbox-status-smoke || FAIL=1

echo
echo "=== [3] summary ==="
python3 - <<PY
print({
  "site_bundle_peer_env_persistence": "green" if $FAIL == 0 else "committed_postproof_failed",
  "transaction_terminal": "COMMITTED",
  "local_peer": "$LOCAL_PEER",
  "remote_peer": "$REMOTE_PEER",
  "transient_manager_env_required": False,
  "durable_dropin": "$DROPIN_NAME",
  "validator_publication": False,
  "git_tag_or_push": False,
  "funds_movement": False,
})
PY

if [ "$FAIL" -eq 0 ]; then
  echo "[ok] VOID site bundle peer env persistence proof passed"
  exit 0
fi

echo "[fail] two-party peer mutation committed, but a post-commit site-bundle proof failed" >&2
exit 1
