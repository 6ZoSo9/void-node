#!/usr/bin/env bash
set -Eeuo pipefail
set +H
umask 077

MARKER="VOID_PUBLIC_EARN_VALIDATOR_ONBOARDING_V1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
LOCAL_NODE="$ROOT/.runtime/clone-run-v1/node-v22.23.2-linux-x64/bin/node"

fail() {
  printf '%s HOLD: %s\n' "$MARKER" "$*" >&2
  exit 1
}

if test "$(id -u)" = 0 && test "${VOID_PARTICIPANT_ALLOW_ROOT:-0}" != 1; then
  fail "do not prepare or run participant onboarding as root"
fi

"$ROOT/run-void-node.sh" prepare

NODE_BIN=""
if command -v node >/dev/null 2>&1 && \
   test "$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)" = 22; then
  NODE_BIN="$(command -v node)"
elif test -x "$LOCAL_NODE" && \
     test "$($LOCAL_NODE -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)" = 22; then
  NODE_BIN="$LOCAL_NODE"
else
  fail "verified Node.js 22 runtime unavailable after clone-run preparation"
fi

cd "$ROOT"
if test "$#" -eq 0; then
  set -- onboard
fi
exec "$NODE_BIN" "$ROOT/tools/void-public-earn-validator-onboarding-v1.mjs" "$@"
