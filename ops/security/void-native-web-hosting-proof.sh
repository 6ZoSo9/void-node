#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="docs/architecture/void-native-web-hosting.md"

echo "=== VOID-native web hosting proof ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

test -f "$DOC"

grep -q 'voidchain.io' "$DOC"
grep -q 'nullfeed.io' "$DOC"
grep -q 'should not depend on Google Cloud' "$DOC"
grep -q 'hosted, mirrored, verified, and served by VOID Network' "$DOC"
grep -q 'content-addressed' "$DOC"
grep -q 'DataNet dataset id or VOID content root' "$DOC"
grep -q '/site/voidchain' "$DOC"
grep -q '/site/nullfeed' "$DOC"
grep -q 'Google Cloud removal' "$DOC"
grep -q 'Do not shut down legacy hosting until a VOID-hosted path is proven' "$DOC"

# Public-facing docs must not present Google Cloud or any cloud bucket as canonical.
# The architecture doc is allowed to mention Google Cloud only as legacy infrastructure to remove.
if grep -RInE 'Google Cloud.*is canonical|Cloud Run.*is canonical|cloud bucket.*is canonical|bucket.*is the source of truth|Google Cloud.*source of truth' README.md docs/public SUPPORT.md 2>/dev/null; then
  echo "[fail] public docs imply external cloud canonical hosting"
  exit 1
fi

make mainnet0-status-smoke

echo "=== VOID-native web hosting proof OK ==="
