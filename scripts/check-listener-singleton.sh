#!/usr/bin/env bash
set -euo pipefail
ACTIVE=$(awk '!/^\s*\/\// && /\[listeners\.guard\] process\+events ceiling set to unlimited/' src/index.ts | wc -l)
if [ "$ACTIVE" -ne 1 ]; then
  echo "FAIL: expected 1 active ListenerCeilingGuard banner, found $ACTIVE" >&2
  exit 1
fi
