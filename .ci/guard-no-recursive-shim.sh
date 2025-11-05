#!/usr/bin/env bash
set -euo pipefail
bad=$(
  grep -nE "__void_getCreateHash\\(" src/index.ts || true
)
if [[ -n "$bad" ]]; then
  echo "[FAIL] recursive __void_getCreateHash detected:"
  echo "$bad"
  exit 1
fi
exit 0
