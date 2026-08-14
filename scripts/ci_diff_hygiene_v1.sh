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

valid_remote() {
  [[ -n "${1:-}" ]] && [[ "$1" != *$'\n'* && "$1" != *$'\r'* ]]
}

EVENT_NAME="${CI_DIFF_EVENT_NAME:-${GITHUB_EVENT_NAME:-}}"
PR_BASE_SHA="${CI_DIFF_PR_BASE_SHA:-}"
PUSH_BEFORE_SHA="${CI_DIFF_PUSH_BEFORE_SHA:-}"
CURRENT_SHA="${CI_DIFF_CURRENT_SHA:-}"
CHECKOUT_SHA="${CI_DIFF_CHECKOUT_SHA:-$CURRENT_SHA}"
BASE_REMOTE="${CI_DIFF_BASE_REMOTE:-}"
HEAD_REMOTE="${CI_DIFF_HEAD_REMOTE:-}"

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
is_sha40 "$CHECKOUT_SHA" || hold "invalid_checkout_sha:${CHECKOUT_SHA:-missing}"
valid_remote "$BASE_REMOTE" || hold "base_remote_invalid_or_missing"
if [[ "$EVENT_NAME" == "pull_request" ]]; then
  valid_remote "$HEAD_REMOTE" || hold "head_remote_invalid_or_missing"
fi

HEAD_SHA="$(git rev-parse HEAD 2>/dev/null)" || hold "head_unreadable"
[[ "$HEAD_SHA" == "$CHECKOUT_SHA" ]] \
  || hold "checkout_not_exact_event_state:head=${HEAD_SHA}:expected=${CHECKOUT_SHA}"
git cat-file -e "${CHECKOUT_SHA}^{commit}" 2>/dev/null \
  || hold "checkout_commit_unavailable:${CHECKOUT_SHA}"

if ! git cat-file -e "${CURRENT_SHA}^{commit}" 2>/dev/null; then
  if [[ "$EVENT_NAME" != "pull_request" ]]; then
    hold "current_commit_unavailable:${CURRENT_SHA}"
  fi
  # Product checks stay on GitHub's pull-request merge/integration checkout.
  # Fetch only the exact PR-head commit for committed-range hygiene; do not
  # replace the working tree or make product checks head-only.
  if ! git fetch --no-tags --no-recurse-submodules --depth=1 "$HEAD_REMOTE" "$CURRENT_SHA" >/dev/null 2>&1; then
    hold "current_commit_unavailable:${CURRENT_SHA}"
  fi
fi
git cat-file -e "${CURRENT_SHA}^{commit}" 2>/dev/null \
  || hold "current_commit_unavailable_after_fetch:${CURRENT_SHA}"

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
printf 'checkout_sha=%s\n' "$CHECKOUT_SHA"
printf 'base_fetch_bounded=true\n'
printf 'head_fetch_bounded=true\n'
printf 'product_checkout_preserved=true\n'
printf 'diff_hygiene_skipped=false\n'
