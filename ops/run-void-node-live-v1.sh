#!/usr/bin/env bash
set -euo pipefail

: "${NODE_PRIVKEY_PATH:?missing NODE_PRIVKEY_PATH}"

HTTP_HOST="${HTTP_HOST:-0.0.0.0}"
HTTP_PORT="${HTTP_PORT:-4100}"
P2P_PORT="${P2P_PORT:-4700}"
NODE_ENV="${NODE_ENV:-dev}"
VOID_PUBLIC_SEED_ADAPTER_BASE="${VOID_PUBLIC_SEED_ADAPTER_BASE:-http://100.122.79.39:4111}"

ROOT="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd -- "$ROOT"

source_commit_before="$(git rev-parse --verify 'HEAD^{commit}')"
source_tree_before="$(git rev-parse --verify 'HEAD^{tree}')"
source_branch_before="$(git symbolic-ref --short -q HEAD)"
source_status_before="$(git status --porcelain=v1)"

source_commit_after="$(git rev-parse --verify 'HEAD^{commit}')"
source_tree_after="$(git rev-parse --verify 'HEAD^{tree}')"
source_branch_after="$(git symbolic-ref --short -q HEAD)"
source_status_after="$(git status --porcelain=v1)"

test "$source_commit_before" = "$source_commit_after"
test "$source_tree_before" = "$source_tree_after"
test "$source_branch_before" = "$source_branch_after"
test "$source_status_before" = "$source_status_after"
test "$source_branch_before" = main
test -z "$source_status_before"
printf '%s' "$source_commit_before" | grep -Eq '^[0-9a-f]{40}$'
printf '%s' "$source_tree_before" | grep -Eq '^[0-9a-f]{40}$'

NODE_BINARY="$(command -v node || command -v nodejs)"
NODE_BINARY="$(readlink -f -- "$NODE_BINARY")"
test -x "$NODE_BINARY"
case "${NODE_BINARY##*/}" in
  node|nodejs) ;;
  *) exit 1 ;;
esac

VOID_PROCESS_SOURCE_IDENTITY_MARKER="VOID_NODE_PROCESS_SOURCE_IDENTITY_V1"
VOID_PROCESS_SOURCE_COMMIT="$source_commit_before"
VOID_PROCESS_SOURCE_TREE="$source_tree_before"
VOID_PROCESS_SOURCE_BRANCH="$source_branch_before"

export NODE_PRIVKEY_PATH HTTP_HOST HTTP_PORT P2P_PORT NODE_ENV VOID_PUBLIC_SEED_ADAPTER_BASE
export VOID_PROCESS_SOURCE_IDENTITY_MARKER VOID_PROCESS_SOURCE_COMMIT
export VOID_PROCESS_SOURCE_TREE VOID_PROCESS_SOURCE_BRANCH

if [ -n "${VOID_HTTP_HOST:-}" ]; then
  export VOID_HTTP_HOST
fi

if [ "${VOID_CANONICAL_PRODUCER_ROLE:-0}" = "1" ]; then
  test "${VOID_CANONICAL_SELF_HTTP_GUARD:-0}" = "1"
  test -z "${NODE_OPTIONS:-}"
  canonical_self_http_preload=(--require "$ROOT/runtime/canonical-producer-self-http-guard-v1.cjs")
  export NODE_OPTIONS="${canonical_self_http_preload[*]}"
fi

exec "$NODE_BINARY" \
  --conditions=void-process-source-identity-v1 \
  --conditions="void-process-source-commit-$VOID_PROCESS_SOURCE_COMMIT" \
  --conditions="void-process-source-tree-$VOID_PROCESS_SOURCE_TREE" \
  --conditions=void-process-source-branch-main \
  --require "$ROOT/node_modules/tsx/dist/preflight.cjs" \
  --import "file://$ROOT/node_modules/tsx/dist/loader.mjs" \
  "$ROOT/src/index.ts"
