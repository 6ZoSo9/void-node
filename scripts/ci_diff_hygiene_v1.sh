#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_CI_DIFF_HYGIENE_V1"
ZERO_SHA="0000000000000000000000000000000000000000"

hold() {
  printf 'HOLD %s: %s\n' "$MARKER" "$*" >&2
  exit 2
}

is_sha40() {
  [[ "${1:-}" =~ ^[0-9a-f]{40}$ ]] && [[ "$1" != "$ZERO_SHA" ]]
}

require_commit() {
  local sha="$1"
  local label="$2"

  if git cat-file -e "${sha}^{commit}" 2>/dev/null; then
    return 0
  fi

  # The checkout intentionally does not persist credentials. This repository is
  # public, so fetch only the exact missing comparison object rather than
  # deepening the whole checkout or silently weakening committed-range hygiene.
  if ! git fetch --no-tags --no-recurse-submodules --depth=1 origin "$sha" >/dev/null 2>&1; then
    hold "${label}_commit_unavailable:${sha}"
  fi
  git cat-file -e "${sha}^{commit}" 2>/dev/null \
    || hold "${label}_commit_unavailable_after_fetch:${sha}"
}

EVENT_NAME="${CI_DIFF_EVENT_NAME:-${GITHUB_EVENT_NAME:-}}"
PR_BASE_SHA="${CI_DIFF_PR_BASE_SHA:-}"
PUSH_BEFORE_SHA="${CI_DIFF_PUSH_BEFORE_SHA:-}"
CURRENT_SHA="${CI_DIFF_CURRENT_SHA:-}"

case "$EVENT_NAME" in
  pull_request)
    BASE_SHA="$PR_BASE_SHA"
    ;;
  push)
    BASE_SHA="$PUSH_BEFORE_SHA"
    ;;
  *)
    hold "unsupported_event:${EVENT_NAME:-missing}"
    ;;
esac

is_sha40 "$BASE_SHA" || hold "invalid_base_sha:${BASE_SHA:-missing}"
is_sha40 "$CURRENT_SHA" || hold "invalid_current_sha:${CURRENT_SHA:-missing}"

HEAD_SHA="$(git rev-parse HEAD 2>/dev/null)" || hold "head_unreadable"
[[ "$HEAD_SHA" == "$CURRENT_SHA" ]] \
  || hold "checkout_not_exact_current:head=${HEAD_SHA}:expected=${CURRENT_SHA}"

require_commit "$CURRENT_SHA" "current"
require_commit "$BASE_SHA" "base"

git diff --check "${BASE_SHA}..${CURRENT_SHA}"

printf '%s_GREEN\n' "$MARKER"
printf 'event=%s\n' "$EVENT_NAME"
printf 'base_sha=%s\n' "$BASE_SHA"
printf 'current_sha=%s\n' "$CURRENT_SHA"
printf 'diff_hygiene_skipped=false\n'
