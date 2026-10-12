#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="docs/public/branch-release-policy.md"

echo "=== public branch/release policy proof ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

test -f "$DOC"
grep -q '^status: active_public_operator_guidance$' "$DOC"
grep -q '`main` is the public stable lane' "$DOC"
grep -q 'Feature branches are for development' "$DOC"
grep -q 'Do not run full nested cross-box bundles for small edits' "$DOC"
grep -q 'force-push `main`' "$DOC"
grep -q '.secrets/nodeA.key' "$DOC"
grep -q 'Branch/release policy: docs/public/branch-release-policy.md' README.md
grep -q 'branch-release-policy.md' docs/public/README.md

make mainnet0-status-smoke

echo "=== public branch/release policy proof OK ==="
