#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [ai-manifest-health] VOID AI manifest template health ==="

FILE="config/void-ai-manifest.template.json"

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

echo "[health] RESULT: OK (template present & sane)"
