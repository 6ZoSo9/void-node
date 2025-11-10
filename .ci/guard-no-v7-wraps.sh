#!/usr/bin/env bash
set -euo pipefail
bad=$(
  grep -nE '__void_trampoline_v[5-9]|__void_forensics|txrootForensicsTrampolineV' src/index.ts || true
)
if [[ -n "$bad" ]]; then
  echo "[FAIL] V7/forensics tramp code present in src/index.ts:"
  echo "$bad"
  exit 1
fi
