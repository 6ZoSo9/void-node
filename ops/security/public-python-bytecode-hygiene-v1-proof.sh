#!/usr/bin/env bash
set -euo pipefail
set +H

MARKER="VOID_PUBLIC_PYTHON_BYTECODE_HYGIENE_V1"
ROOT="${VOID_REPO:-$(git rev-parse --show-toplevel)}"
OUT="$(mktemp -d /tmp/void-python-bytecode-hygiene-v1-XXXXXX)"
CACHE="$OUT/pycache"
trap 'rm -rf "$OUT"' EXIT
mkdir -p "$CACHE"
cd "$ROOT"

before="$(git status --porcelain --untracked-files=all)"

node scripts/prove_public_python_bytecode_hygiene_v1.mjs

tracked_offenders="$OUT/tracked-bytecode.txt"
git ls-files -z | python3 -c '
import pathlib, sys
raw = sys.stdin.buffer.read().split(b"\0")
out = []
for item in raw:
    if not item:
        continue
    name = item.decode("utf-8", "surrogateescape")
    parts = name.split("/")
    low = name.lower()
    if "__pycache__" in parts or low.endswith((".pyc", ".pyo", ".pyd")):
        out.append(name)
pathlib.Path(sys.argv[1]).write_text("\n".join(out) + ("\n" if out else ""))
' "$tracked_offenders"
if test -s "$tracked_offenders"; then
  echo "tracked Python bytecode is forbidden:" >&2
  cat "$tracked_offenders" >&2
  exit 1
fi

# Compile every tracked Python source while redirecting bytecode outside the repository.
mapfile -d '' -t py_files < <(git ls-files -z '*.py')
if test "${#py_files[@]}" -gt 0; then
  printf '%s\0' "${py_files[@]}" | \
    xargs -0 -r -n 80 env PYTHONPYCACHEPREFIX="$CACHE" python3 -m py_compile
fi

leaked="$OUT/leaked-bytecode.txt"
find . \
  -path './.git' -prune -o \
  -path './node_modules' -prune -o \
  -path './dist-release' -prune -o \
  \( -type d -name '__pycache__' -o -type f \( -name '*.pyc' -o -name '*.pyo' -o -name '*.pyd' \) \) \
  -print > "$leaked"
if test -s "$leaked"; then
  echo "Python bytecode leaked into the repository:" >&2
  cat "$leaked" >&2
  exit 1
fi

after="$(git status --porcelain --untracked-files=all)"
test "$after" = "$before" || {
  echo "Python compilation changed repository state:" >&2
  diff -u <(printf '%s\n' "$before") <(printf '%s\n' "$after") >&2 || true
  exit 1
}

echo "tracked_python_bytecode=0"
echo "compile_cache_outside_repository=true"
echo "repository_state_unchanged=true"
echo "$MARKER FULL_GREEN"
