#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

echo "[mainnet-keys-health] repo=$ROOT"

echo
echo "[mainnet-keys-health] step 1: keys-preflight..."
RC=0
if ./ops/void-mainnet-keys-preflight.sh; then
  echo "[mainnet-keys-health] keys-preflight passed."
  RC=0
else
  RC=$?
  echo "[mainnet-keys-health] keys-preflight FAILED with code $RC"
fi

echo
if [[ "$RC" -eq 0 ]]; then
  echo "[mainnet-keys-health] RESULT: OK (keys plan present, no tracked .key files, no obvious secrets in mainnet docs)"
else
  echo "[mainnet-keys-health] RESULT: FAIL (see errors above)"
fi

exit "$RC"
