#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
DOC="docs/public/mainnet0-public-live-closeout.md"

echo "=== Mainnet-0 public live closeout proof ==="

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] closeout doc exists ==="
test -f "$DOC"
echo "[ok] $DOC exists"

echo
echo "=== [3] closeout doc markers ==="
grep -q '^status: public_mainnet0_live$' "$DOC"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$DOC"
grep -q 'current_public_status_checkpoint: ae513217 / ckpt-current-public-status-public-surface-green-20260525-102802' "$DOC"
grep -q 'VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0' "$DOC"
grep -q 'make mainnet0-public-live-closeout-proof' "$DOC"
grep -q 'make mainnet0-current-public-status-proof' "$DOC"
grep -q 'make mainnet0-public-docs-stack-proof' "$DOC"
grep -q 'make mainnet0-public-surface-proof' "$DOC"
grep -q 'make mainnet0-status-smoke' "$DOC"
grep -q 'make mainnet0-crossbox-status-smoke' "$DOC"
echo "[ok] closeout doc markers present"

echo
echo "=== [4] served / non-public surface markers ==="
grep -q -- '- /participant' "$DOC"
grep -q -- '- /__void/ready.json' "$DOC"
grep -q -- '- /__void/runtime/validator-truth/status' "$DOC"
grep -q -- '- /$' "$DOC"
grep -q -- '- /__void/status' "$DOC"
grep -q -- '- GET /__void/participant/stake/next-onboard' "$DOC"
echo "[ok] served and non-public surface markers present"

echo
echo "=== [5] guarded boundary markers ==="
grep -q 'does not authorize validator admission' "$DOC"
grep -q 'treasury spend' "$DOC"
grep -q 'Buy VOID fulfillment' "$DOC"
grep -q 'authority transfer' "$DOC"
grep -q 'vault126 onboarding execution' "$DOC"
grep -q 'Public validator registration remains candidate/waiting only for Mainnet-0' "$DOC"
echo "[ok] guarded boundary markers present"

echo
echo "=== [6] chain public proof stack ==="
make mainnet0-current-public-status-proof
make mainnet0-public-docs-stack-proof
make mainnet0-public-surface-proof
make mainnet0-status-smoke

echo
echo "=== [7] ready endpoint ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-public-live-closeout-ready.json
echo
python3 - /tmp/void-public-live-closeout-ready.json <<'PY'
import json, sys
p = sys.argv[1]
j = json.load(open(p))
assert j.get("ready") is True, j
assert j.get("gap") == 0, j
assert j.get("txroot_live") == 1, j
print("[ok] ready=true gap=0 txroot_live=1")
PY

echo
echo "=== public live closeout proof OK ==="
