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
  pull_request|push) ;;
  *) hold "unsupported_event:${EVENT_NAME:-missing}" ;;
esac

is_sha40 "$CURRENT_SHA" || hold "invalid_current_sha:${CURRENT_SHA:-missing}"
is_sha40 "$CHECKOUT_SHA" || hold "invalid_checkout_sha:${CHECKOUT_SHA:-missing}"
valid_remote "$BASE_REMOTE" || hold "base_remote_invalid_or_missing"
if [[ "$EVENT_NAME" == "pull_request" ]]; then
  is_sha40 "$PR_BASE_SHA" || hold "invalid_event_base_sha:${PR_BASE_SHA:-missing}"
  valid_remote "$HEAD_REMOTE" || hold "head_remote_invalid_or_missing"
else
  is_sha40 "$PUSH_BEFORE_SHA" || hold "invalid_base_sha:${PUSH_BEFORE_SHA:-missing}"
fi

HEAD_SHA="$(git rev-parse HEAD 2>/dev/null)" || hold "head_unreadable"
[[ "$HEAD_SHA" == "$CHECKOUT_SHA" ]] \
  || hold "checkout_not_exact_event_state:head=${HEAD_SHA}:expected=${CHECKOUT_SHA}"
git cat-file -e "${CHECKOUT_SHA}^{commit}" 2>/dev/null \
  || hold "checkout_commit_unavailable:${CHECKOUT_SHA}"

EVENT_BASE_MATCHES_INTEGRATION_BASE="not_applicable"
INTEGRATION_BASE_FROM_CHECKOUT="false"
if [[ "$EVENT_NAME" == "pull_request" ]]; then
  # GitHub product checks execute on refs/pull/<n>/merge. That synthetic merge
  # is the authoritative integration state for this run. The PR event's
  # base.sha can lag after ordinary branch reconciliation, so it is retained as
  # diagnostic evidence only; using it for the committed range can silently
  # widen the check to already-merged history.
  mapfile -t CHECKOUT_PARENTS < <(
    git cat-file -p "$CHECKOUT_SHA" 2>/dev/null | sed -n 's/^parent \([0-9a-f]\{40\}\)$/\1/p'
  )
  [[ "${#CHECKOUT_PARENTS[@]}" -eq 2 ]] \
    || hold "checkout_not_two_parent_pr_integration:${CHECKOUT_SHA}:parents=${#CHECKOUT_PARENTS[@]}"
  BASE_SHA="${CHECKOUT_PARENTS[0]}"
  CHECKOUT_PR_HEAD_SHA="${CHECKOUT_PARENTS[1]}"
  is_sha40 "$BASE_SHA" || hold "invalid_integration_base_sha:${BASE_SHA:-missing}"
  is_sha40 "$CHECKOUT_PR_HEAD_SHA" || hold "invalid_integration_head_sha:${CHECKOUT_PR_HEAD_SHA:-missing}"
  [[ "$CHECKOUT_PR_HEAD_SHA" == "$CURRENT_SHA" ]] \
    || hold "checkout_pr_head_mismatch:checkout_parent=${CHECKOUT_PR_HEAD_SHA}:expected=${CURRENT_SHA}"
  INTEGRATION_BASE_FROM_CHECKOUT="true"
  if [[ "$PR_BASE_SHA" == "$BASE_SHA" ]]; then
    EVENT_BASE_MATCHES_INTEGRATION_BASE="true"
  else
    EVENT_BASE_MATCHES_INTEGRATION_BASE="false"
  fi
else
  BASE_SHA="$PUSH_BEFORE_SHA"
fi

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
  # integration-base commit from the base repository, which also keeps fork PRs
  # from depending on the head fork containing the current base commit.
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
if [[ "$EVENT_NAME" == "pull_request" ]]; then
  printf 'event_base_sha=%s\n' "$PR_BASE_SHA"
fi
printf 'current_sha=%s\n' "$CURRENT_SHA"
printf 'checkout_sha=%s\n' "$CHECKOUT_SHA"
printf 'integration_base_from_checkout=%s\n' "$INTEGRATION_BASE_FROM_CHECKOUT"
printf 'event_base_matches_integration_base=%s\n' "$EVENT_BASE_MATCHES_INTEGRATION_BASE"
printf 'base_fetch_bounded=true\n'
printf 'head_fetch_bounded=true\n'
printf 'product_checkout_preserved=true\n'
printf 'diff_hygiene_skipped=false\n'
