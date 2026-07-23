#!/usr/bin/env bash
set -euo pipefail
set +H

MARKER="VOID_GITHUB_SSH_REMOTE_NORMALIZATION_V1"
REPO="${1:-${VOID_REPO:-$(git rev-parse --show-toplevel)}}"
VERIFY="${VOID_SSH_REMOTE_VERIFY:-1}"
REMOTE_NAME="${VOID_GIT_REMOTE_NAME:-origin}"

say() { printf '%s\n' "$*"; }
die() { say "ERROR: $*" >&2; exit 1; }

command -v git >/dev/null 2>&1 || die "git is required"
test -d "$REPO/.git" || die "not a git checkout: $REPO"
case "$VERIFY" in 0|1) ;; *) die "VOID_SSH_REMOTE_VERIFY must be 0 or 1" ;; esac

current="$(git -C "$REPO" remote get-url "$REMOTE_NAME")"
normalized=""
case "$current" in
  git@github.com:*.git) normalized="$current" ;;
  git@github.com:*) normalized="${current}.git" ;;
  https://github.com/*.git)
    normalized="git@github.com:${current#https://github.com/}"
    ;;
  https://github.com/*)
    normalized="git@github.com:${current#https://github.com/}.git"
    ;;
  ssh://git@github.com/*.git)
    normalized="git@github.com:${current#ssh://git@github.com/}"
    ;;
  ssh://git@github.com/*)
    normalized="git@github.com:${current#ssh://git@github.com/}.git"
    ;;
  *) die "unsupported non-GitHub origin: $current" ;;
esac

# Tight allowlist prevents a crafted remote from smuggling shell or URL syntax.
case "$normalized" in
  git@github.com:[A-Za-z0-9_.-]*\/[A-Za-z0-9_.-]*.git) ;;
  *) die "normalized SSH remote failed safety validation: $normalized" ;;
esac

git -C "$REPO" remote set-url "$REMOTE_NAME" "$normalized"
actual="$(git -C "$REPO" remote get-url "$REMOTE_NAME")"
test "$actual" = "$normalized" || die "remote normalization did not persist"

say "remote_name=$REMOTE_NAME"
say "remote_before=$current"
say "remote_after=$normalized"
say "git_terminal_prompt=false"

if test "$VERIFY" = 1; then
  GIT_TERMINAL_PROMPT=0 \
  GIT_SSH_COMMAND='ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new' \
    git -C "$REPO" ls-remote "$REMOTE_NAME" HEAD >/dev/null
  say "ssh_batchmode_probe=green"
else
  say "ssh_batchmode_probe=skipped"
fi
say "$MARKER GREEN"
