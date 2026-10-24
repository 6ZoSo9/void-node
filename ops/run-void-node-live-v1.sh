#!/usr/bin/env bash
set -euo pipefail

: "${NODE_PRIVKEY_PATH:?missing NODE_PRIVKEY_PATH}"

HTTP_HOST="${HTTP_HOST:-0.0.0.0}"
HTTP_PORT="${HTTP_PORT:-4100}"
P2P_PORT="${P2P_PORT:-4700}"
NODE_ENV="${NODE_ENV:-dev}"

ROOT="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd -- "$ROOT"

GIT_BINARY="$(command -v git)"
GIT_BINARY="$(readlink -f -- "$GIT_BINARY")"
test -x "$GIT_BINARY"
case "${GIT_BINARY##*/}" in
  git) ;;
  *) exit 1 ;;
esac

source_git() {
  env \
    -u GIT_DIR \
    -u GIT_WORK_TREE \
    -u GIT_COMMON_DIR \
    -u GIT_INDEX_FILE \
    -u GIT_OBJECT_DIRECTORY \
    -u GIT_ALTERNATE_OBJECT_DIRECTORIES \
    -u GIT_NAMESPACE \
    -u GIT_REPLACE_REF_BASE \
    -u GIT_CONFIG \
    -u GIT_CONFIG_PARAMETERS \
    -u GIT_CONFIG_COUNT \
    -u GIT_EXEC_PATH \
    -u GIT_SSH \
    -u GIT_SSH_COMMAND \
    GIT_CONFIG_GLOBAL=/dev/null \
    GIT_CONFIG_SYSTEM=/dev/null \
    GIT_NO_REPLACE_OBJECTS=1 \
    GIT_OPTIONAL_LOCKS=0 \
    GIT_TERMINAL_PROMPT=0 \
    GIT_ASKPASS=/bin/false \
    "$GIT_BINARY" -c "safe.directory=$ROOT" "$@"
}

source_commit_before="$(source_git rev-parse --verify 'HEAD^{commit}')"
source_tree_before="$(source_git rev-parse --verify 'HEAD^{tree}')"
source_branch_before="$(source_git symbolic-ref --short -q HEAD)"
source_status_before="$(source_git status --porcelain=v1)"

source_commit_after="$(source_git rev-parse --verify 'HEAD^{commit}')"
source_tree_after="$(source_git rev-parse --verify 'HEAD^{tree}')"
source_branch_after="$(source_git symbolic-ref --short -q HEAD)"
source_status_after="$(source_git status --porcelain=v1)"

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

export NODE_PRIVKEY_PATH HTTP_HOST HTTP_PORT P2P_PORT NODE_ENV
export VOID_PROCESS_SOURCE_IDENTITY_MARKER VOID_PROCESS_SOURCE_COMMIT
export VOID_PROCESS_SOURCE_TREE VOID_PROCESS_SOURCE_BRANCH

if [ -n "${VOID_HTTP_HOST:-}" ]; then
  export VOID_HTTP_HOST
fi

if [ "${VOID_CANONICAL_PRODUCER_ROLE:-0}" = "1" ]; then
  test "${VOID_CANONICAL_SELF_HTTP_GUARD:-0}" = "1"
  test "${VOID_CANONICAL_DISABLE_LEGACY_SELF_HTTP_OBSERVERS:-0}" = "1"
  test -z "${NODE_OPTIONS:-}"
  # Unlike a second git hash, an unprivileged service UID cannot mutate
  # root-owned source, loader, git, or ancestor inodes after this succeeds.
  # This intentionally HOLDs a writable developer checkout until the
  # separately authorized immutable installation/cutover is qualified.
  "$NODE_BINARY" "$ROOT/runtime/canonical-producer-source-custody-v1.cjs" "$ROOT"
  # Select an exact reviewed source generation; never bypass the guard.
  # Both the checked-out source and tracked commit must agree, and the
  # selected guard independently rehashes the source at Node startup.
  producer_index_blob="$(source_git hash-object -- src/index.ts)"
  tracked_index_blob="$(source_git rev-parse --verify "${source_commit_before}:src/index.ts")"
  test "$producer_index_blob" = "$tracked_index_blob"
  case "$producer_index_blob" in
    1fde828c97175560f98ab070af33eefc595f8002)
      canonical_self_http_preload=(--require "$ROOT/runtime/canonical-producer-self-http-guard-v1.cjs")
      ;;
    8198912a70c8db0c81dad5d341cb4a779906c851)
      canonical_self_http_preload=(--require "$ROOT/runtime/canonical-producer-self-http-guard-v2.cjs")
      ;;
    40239e0f76aa1edce43523d18c1b57691e41e8cf)
      canonical_self_http_preload=(--require "$ROOT/runtime/canonical-producer-self-http-guard-v3.cjs")
      ;;
    123ec1792a027f93d4c9030749a0e7e136a75a44)
      canonical_self_http_preload=(--require "$ROOT/runtime/canonical-producer-self-http-guard-v4.cjs")
      ;;
    a09661797aa4295371c036be36d82995e5233269)
      canonical_self_http_preload=(--require "$ROOT/runtime/canonical-producer-self-http-guard-v5.cjs")
      ;;
    *)
      echo "VOID_CANONICAL_PRODUCER_SOURCE_GENERATION_HOLD" >&2
      exit 1
      ;;
  esac
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
