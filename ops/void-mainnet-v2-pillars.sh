#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[pillars-mainnet-v2] step 1: v2 health snapshot..."
./ops/void-mainnet-v2-health-snapshot.sh
rc=$?

if [ "$rc" -eq 0 ]; then
  echo "[pillars-mainnet-v2] RESULT: OK (mainnet v2 health all==1)"
else
  echo "[pillars-mainnet-v2] RESULT: BAD (mainnet v2 health failed)" >&2
fi

exit "$rc"
