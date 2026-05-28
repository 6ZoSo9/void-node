#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

echo "=== public SUPPORT.md proof ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

test -f SUPPORT.md
grep -q 'VOID Network Support' SUPPORT.md
grep -q 'docs/public/start-here.md' SUPPORT.md
grep -q 'docs/public/quick-start.md' SUPPORT.md
grep -q 'http://127.0.0.1:4100/__void/ready.json' SUPPORT.md
grep -q 'ready=true' SUPPORT.md
grep -q 'gap=0' SUPPORT.md
grep -q 'txroot_live=1' SUPPORT.md
grep -q 'Never share secrets' SUPPORT.md
grep -q 'private keys' SUPPORT.md
grep -q 'Public validator registration remains candidate/waiting only for Mainnet-0.' SUPPORT.md
grep -q 'Support guide: SUPPORT.md' README.md

make mainnet0-status-smoke

echo "=== public SUPPORT.md proof OK ==="
