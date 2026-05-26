#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="docs/public/mainnet0-public-live-announcement.md"

echo "=== Mainnet-0 public live announcement proof ==="

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] announcement doc exists ==="
test -f "$DOC"
echo "[ok] $DOC exists"

echo
echo "=== [3] announcement status markers ==="
grep -q '^status: public_mainnet0_live$' "$DOC"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$DOC"
grep -q 'current_public_status_checkpoint: e5f6a8a4 / ckpt-current-public-status-public-live-closeout-green-20260525-130102' "$DOC"
grep -q 'public_live_closeout_checkpoint: 4180224d / ckpt-mainnet0-public-live-closeout-green-20260525-110841' "$DOC"
grep -q 'VOID Mainnet-0 is public-live' "$DOC"
echo "[ok] status markers present"

echo
echo "=== [4] live surface markers ==="
grep -q 'public participant page' "$DOC"
grep -q 'local node readiness endpoint' "$DOC"
grep -q 'validator-truth status endpoint' "$DOC"
grep -q 'public documentation stack' "$DOC"
grep -q 'developer reference' "$DOC"
grep -q 'support runbook' "$DOC"
grep -q 'Windows WSL2 quick-start guide' "$DOC"
grep -q 'cross-box Precision and Alienware runtime proof' "$DOC"
echo "[ok] live surface markers present"

echo
echo "=== [5] guarded boundary markers ==="
grep -q 'public active validator admission' "$DOC"
grep -q 'operator validator admission mutation' "$DOC"
grep -q 'vault126 onboarding execution' "$DOC"
grep -q 'treasury spend' "$DOC"
grep -q 'Buy VOID fulfillment' "$DOC"
grep -q 'authority transfer' "$DOC"
grep -q 'Public validator registration remains candidate/waiting only for Mainnet-0' "$DOC"
echo "[ok] guarded boundary markers present"

echo
echo "=== [6] route markers ==="
grep -q -- '- /participant' "$DOC"
grep -q -- '- /__void/ready.json' "$DOC"
grep -q -- '- /__void/runtime/validator-truth/status' "$DOC"
grep -q -- '- /$' "$DOC"
grep -q -- '- /__void/status' "$DOC"
grep -q -- '- GET /__void/participant/stake/next-onboard' "$DOC"
echo "[ok] route markers present"

echo
echo "=== [7] proof command markers ==="
grep -q 'make mainnet0-current-public-status-proof' "$DOC"
grep -q 'make mainnet0-public-live-closeout-proof' "$DOC"
grep -q 'make mainnet0-public-docs-stack-proof' "$DOC"
grep -q 'make mainnet0-public-surface-proof' "$DOC"
grep -q 'make mainnet0-crossbox-status-smoke' "$DOC"
echo "[ok] proof command markers present"

echo
echo "=== [8] safe wording marker ==="
grep -q 'Safe short wording:' "$DOC"
grep -q 'Public active validator admission, treasury spend, Buy VOID fulfillment, and authority transfer remain guarded.' "$DOC"
echo "[ok] safe wording present"

echo
echo "=== [9] chain current baseline proofs ==="
make mainnet0-current-public-status-proof
make mainnet0-public-live-closeout-proof
make mainnet0-public-docs-stack-proof
make mainnet0-public-surface-proof
make mainnet0-status-smoke

echo
echo "=== public live announcement proof OK ==="
