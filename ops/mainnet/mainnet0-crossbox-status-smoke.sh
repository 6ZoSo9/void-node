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
if [ -n "$local_host" ] && [ "$peer_host" = "$local_host" ]; then
  fail "crossbox_peer_local_host_forbidden"
fi
if [ -n "$local_short" ] && [ "$peer_host" = "$local_short" ]; then
  fail "crossbox_peer_local_host_forbidden"
fi

echo "=== Mainnet-0 cross-box status smoke ==="
echo "crossbox_peer=$CROSSBOX_PEER"
echo "crossbox_peer_explicit=true"
echo "local_fallback_allowed=false"

echo
echo "=== [1] local truth ==="
git rev-parse --short HEAD
git describe --tags --always --dirty
git status --short

echo
echo "=== [2] local smoke ==="
make mainnet0-status-smoke

echo
echo "=== [3] remote peer sync truth ==="
ssh -o BatchMode=yes -o ConnectTimeout=6 "$CROSSBOX_PEER" '
set -euo pipefail
cd /home/zoso/dev/void-node

echo "peer_head=$(git rev-parse --short HEAD)"
echo "peer_describe=$(git describe --tags --always --dirty)"
git status --short
'

echo
echo "=== [4] remote peer smoke ==="
ssh -o BatchMode=yes -o ConnectTimeout=6 "$CROSSBOX_PEER" '
set -euo pipefail
cd /home/zoso/dev/void-node
make mainnet0-status-smoke
'

echo
echo "[ok] Mainnet-0 cross-box status smoke passed"
