#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="docs/public/proof-cadence.md"

echo "=== public proof cadence proof ==="

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] proof cadence doc markers ==="
test -f "$DOC"
grep -q '^status: active_public_operator_guidance$' "$DOC"
grep -q 'Tier 1: quick local smoke' "$DOC"
grep -q 'Tier 2: targeted local proof' "$DOC"
grep -q 'Tier 3: full cross-box closeout' "$DOC"
grep -q 'make mainnet0-status-smoke' "$DOC"
grep -q 'make mainnet0-crossbox-status-smoke' "$DOC"
grep -q 'Do not run every public proof bundle after every small edit.' "$DOC"
grep -q '.secrets/nodeA.key' "$DOC"
grep -q 'ignored, and untracked' "$DOC"
echo "[ok] proof cadence doc markers present"

echo
echo "=== [3] linked from README and public docs index ==="
grep -q 'Proof cadence: docs/public/proof-cadence.md' README.md
grep -q 'proof-cadence.md' docs/public/README.md
echo "[ok] proof cadence links present"

echo
echo "=== [4] baseline public landing/security proofs ==="
make public-github-landing-proof
make public-repo-hardening-proof
make mainnet0-status-smoke

echo
echo "=== public proof cadence proof OK ==="
