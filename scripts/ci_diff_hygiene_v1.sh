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

EVENT_NAME="${CI_DIFF_EVENT_NAME:-${GITHUB_EVENT_NAME:-}}"
PR_BASE_SHA="${CI_DIFF_PR_BASE_SHA:-}"
PUSH_BEFORE_SHA="${CI_DIFF_PUSH_BEFORE_SHA:-}"
CURRENT_SHA="${CI_DIFF_CURRENT_SHA:-}"
BASE_REMOTE="${CI_DIFF_BASE_REMOTE:-}"

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
[[ -n "$BASE_REMOTE" ]] || hold "base_remote_missing"
[[ "$BASE_REMOTE" != *$'\n'* && "$BASE_REMOTE" != *$'\r'* ]] || hold "base_remote_invalid"

HEAD_SHA="$(git rev-parse HEAD 2>/dev/null)" || hold "head_unreadable"
[[ "$HEAD_SHA" == "$CURRENT_SHA" ]] \
  || hold "checkout_not_exact_current:head=${HEAD_SHA}:expected=${CURRENT_SHA}"
git cat-file -e "${CURRENT_SHA}^{commit}" 2>/dev/null \
  || hold "current_commit_unavailable:${CURRENT_SHA}"

if ! git cat-file -e "${BASE_SHA}^{commit}" 2>/dev/null; then
  # Checkout credentials remain non-persistent. Fetch only the exact missing
  # comparison commit from the base repository, which also keeps fork PRs from
  # depending on the head fork containing the current base commit.
  if ! git fetch --no-tags --no-recurse-submodules --depth=1 "$BASE_REMOTE" "$BASE_SHA" >/dev/null 2>&1; then
    hold "base_commit_unavailable:${BASE_SHA}"
  fi
fi
git cat-file -e "${BASE_SHA}^{commit}" 2>/dev/null \
  || hold "base_commit_unavailable_after_fetch:${BASE_SHA}"

git diff --check "${BASE_SHA}..${CURRENT_SHA}"

printf '%s_GREEN\n' "$MARKER"
printf 'event=%s\n' "$EVENT_NAME"
printf 'base_sha=%s\n' "$BASE_SHA"
printf 'current_sha=%s\n' "$CURRENT_SHA"
printf 'base_fetch_bounded=true\n'
printf 'diff_hygiene_skipped=false\n'
