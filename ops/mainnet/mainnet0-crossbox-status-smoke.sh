#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

CROSSBOX_PEER="${VOID_MAINNET0_CROSSBOX_PEER:-}"

fail() {
  echo "[ERR] $*" >&2
  exit 2
}

if [ -z "$CROSSBOX_PEER" ]; then
  fail "crossbox_peer_required: set VOID_MAINNET0_CROSSBOX_PEER to an explicitly reviewed nonlocal fleet peer"
fi

if [[ "$CROSSBOX_PEER" =~ [[:space:]] ]] || [[ "$CROSSBOX_PEER" == -* ]] || \
   [[ ! "$CROSSBOX_PEER" =~ ^[A-Za-z0-9._-]+(@[A-Za-z0-9._:-]+)?$ ]]; then
  fail "crossbox_peer_invalid"
fi

peer_lower="$(printf '%s' "$CROSSBOX_PEER" | tr '[:upper:]' '[:lower:]')"
case "$peer_lower" in
  *alienware*|*100.122.79.39*)
    fail "crossbox_peer_retired"
    ;;
esac

peer_host="${CROSSBOX_PEER##*@}"
peer_host_lower="$(printf '%s' "$peer_host" | tr '[:upper:]' '[:lower:]')"
case "$peer_host_lower" in
  localhost|127.*|0.0.0.0|::1)
    fail "crossbox_peer_loopback_forbidden"
    ;;
esac

local_host="$(hostname 2>/dev/null || true)"
local_short="$(hostname -s 2>/dev/null || true)"
local_host_lower="$(printf '%s' "$local_host" | tr '[:upper:]' '[:lower:]')"
local_short_lower="$(printf '%s' "$local_short" | tr '[:upper:]' '[:lower:]')"
if [ -n "$local_host_lower" ] && [ "$peer_host_lower" = "$local_host_lower" ]; then
  fail "crossbox_peer_local_host_forbidden"
fi
if [ -n "$local_short_lower" ] && [ "$peer_host_lower" = "$local_short_lower" ]; then
  fail "crossbox_peer_local_host_forbidden"
fi

echo "=== Mainnet-0 cross-box status smoke ==="
echo "crossbox_peer=$CROSSBOX_PEER"
echo "crossbox_peer_explicit=true"
echo "local_fallback_allowed=false"

echo
echo "=== [1] local truth ==="
LOCAL_HEAD="$(git rev-parse HEAD)"
LOCAL_DESCRIBE="$(git describe --tags --always --dirty)"
LOCAL_STATUS="$(git status --porcelain)"
echo "local_head=$LOCAL_HEAD"
echo "local_describe=$LOCAL_DESCRIBE"
if [ -n "$LOCAL_STATUS" ]; then
  printf '%s\n' "$LOCAL_STATUS"
  fail "crossbox_local_repo_dirty"
fi
echo "local_repo_clean=true"

echo
echo "=== [2] local smoke ==="
make mainnet0-status-smoke

echo
echo "=== [3] remote peer identity and sync truth ==="
mapfile -t REMOTE_TRUTH < <(
  ssh -o BatchMode=yes -o ConnectTimeout=6 "$CROSSBOX_PEER" '
set -euo pipefail
cd /home/zoso/dev/void-node

status="$(git status --porcelain)"
if [ -n "$status" ]; then
  printf "%s\n" "$status" >&2
  exit 3
fi

hostname
git rev-parse HEAD
git describe --tags --always --dirty
'
)

if [ "${#REMOTE_TRUTH[@]}" -ne 3 ]; then
  fail "crossbox_remote_truth_shape_invalid"
fi

REMOTE_HOST="${REMOTE_TRUTH[0]}"
REMOTE_HEAD="${REMOTE_TRUTH[1]}"
REMOTE_DESCRIBE="${REMOTE_TRUTH[2]}"
REMOTE_HOST_LOWER="$(printf '%s' "$REMOTE_HOST" | tr '[:upper:]' '[:lower:]')"

if [ -z "$REMOTE_HOST_LOWER" ]; then
  fail "crossbox_remote_hostname_missing"
fi
if [ "$REMOTE_HOST_LOWER" = "$local_host_lower" ] || \
   { [ -n "$local_short_lower" ] && [ "$REMOTE_HOST_LOWER" = "$local_short_lower" ]; }; then
  fail "crossbox_remote_resolved_to_local_host"
fi
if [ "$REMOTE_HEAD" != "$LOCAL_HEAD" ]; then
  echo "local_head=$LOCAL_HEAD" >&2
  echo "remote_head=$REMOTE_HEAD" >&2
  fail "crossbox_head_mismatch"
fi

echo "remote_host=$REMOTE_HOST"
echo "remote_head=$REMOTE_HEAD"
echo "remote_describe=$REMOTE_DESCRIBE"
echo "remote_repo_clean=true"
echo "exact_head_match=true"
echo "distinct_remote_host_verified=true"

echo
echo "=== [4] remote peer smoke ==="
ssh -o BatchMode=yes -o ConnectTimeout=6 "$CROSSBOX_PEER" '
set -euo pipefail
cd /home/zoso/dev/void-node
make mainnet0-status-smoke
'

echo
echo "[ok] Mainnet-0 cross-box status smoke passed"
