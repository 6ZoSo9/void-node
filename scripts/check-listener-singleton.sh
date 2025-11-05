#!/usr/bin/env bash
set -euo pipefail

# 1) Exactly one active banner in src/index.ts
ACTIVE_IN_INDEX=$(grep -E -c '^[[:space:]]*\(function[[:space:]]+ListenerCeilingGuardV1\(' src/index.ts || echo 0)

# 2) No banners anywhere else under src/ (excluding parked scratch)
OTHER=$(git grep -n 'ListenerCeilingGuardV1' -- 'src' ':!src/index.ts' ':!src/.park' || true | wc -l | tr -d '[:space:]')

if [[ "$ACTIVE_IN_INDEX" != "1" || "$OTHER" != "0" ]]; then
  echo "FAIL: ListenerCeilingGuard singleton check — in_index=$ACTIVE_IN_INDEX, elsewhere=$OTHER" >&2
  echo "--- matches in src/index.ts ---" >&2
  (grep -n 'ListenerCeilingGuardV1' src/index.ts || true) >&2
  echo "--- matches elsewhere (excluding .park) ---" >&2
  (git grep -n 'ListenerCeilingGuardV1' -- 'src' ':!src/index.ts' ':!src/.park' || true) >&2
  exit 1
fi
echo "OK: ListenerCeilingGuard singleton verified (src/index.ts=1, elsewhere=0)"
