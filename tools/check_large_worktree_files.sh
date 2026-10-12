#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

LIMIT_BYTES="${VOID_WORKTREE_LARGE_FILE_LIMIT_BYTES:-10485760}"
BIG=""

while IFS= read -r -d '' f; do
  [ -f "$f" ] || continue
  sz="$(stat -c '%s' "$f")" || exit 1
  if [ "$sz" -ge "$LIMIT_BYTES" ]; then
    BIG="${BIG}${f}
"
  fi
done < <(git ls-files -z)

if [ -n "${BIG:-}" ]; then
  echo "Files >=${LIMIT_BYTES} bytes:"
  printf '%s' "$BIG"
  exit 1
fi

echo "OK: no tracked working-tree files >=${LIMIT_BYTES} bytes"
