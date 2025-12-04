#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

FILE="docs/VOID-UI-COMMAND-CENTER-V0.md"

echo "=== [dev-ui-command-center-spec-smoke] UI Command Center v0 spec smoke ==="
if [ ! -f "$FILE" ]; then
  echo "[FAIL] $FILE is missing"
  exit 1
fi

echo "[ok] spec file exists: $FILE"
echo

echo "=== [head] first 24 lines ==="
sed -n '1,24p' "$FILE"

echo
echo "=== [dev-ui-command-center-spec-smoke] done ==="
