#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

want=".githooks"
have="$(git config --get core.hooksPath || true)"

if [[ "$have" != "$want" ]]; then
  git config core.hooksPath "$want"
  echo "[ok] set core.hooksPath=$want"
else
  echo "[ok] core.hooksPath already $want"
fi

# sanity
test -x .githooks/pre-commit || { echo "[ERR] missing .githooks/pre-commit"; exit 2; }
echo "[ok] hooks present: .githooks/pre-commit"
