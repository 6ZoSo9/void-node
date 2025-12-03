#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

FILE="config/void-ai-manifest.live.json"

echo "=== [ai-manifest-live-health] VOID AI manifest LIVE health ==="
echo "[cfg] FILE = $FILE"
echo

if [ ! -f "$FILE" ]; then
  echo "[health] MISSING: $FILE"
  exit 1
fi

if ! jq -e '.version == "void-ai-manifest-v1"' "$FILE" >/dev/null; then
  echo "[health] BAD version (expected void-ai-manifest-v1)"
  exit 1
fi

if ! jq -e '.chain.chainId == 2050' "$FILE" >/dev/null; then
  echo "[health] BAD chainId (expected 2050)"
  exit 1
fi

total_contracts="$(jq '[.systemContracts[]] | length' "$FILE")"
non_zero_contracts="$(jq '[.systemContracts[].address] | map(select(. != "0x0000000000000000000000000000000000000000")) | length' "$FILE")"

echo "[health] total systemContracts    = $total_contracts"
echo "[health] non-zero address count   = $non_zero_contracts"

# At this stage of mainnet planning, zero addresses are OK.
# This hammer only asserts: file exists + shape correct.
echo "[health] RESULT: OK (LIVE AI manifest present & structurally sane)"
