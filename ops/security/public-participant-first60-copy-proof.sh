#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
HTML="/tmp/void-participant-first60-copy-proof-$(date +%Y%m%d-%H%M%S).html"

echo "=== public participant first-60 copy proof ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [1] source markers ==="
grep -q 'Mainnet-0 is public-live.' src/index.ts
grep -q 'Mainnet-0 public-live' src/index.ts
grep -q 'Public-live status does not open guarded actions.' src/index.ts
grep -q 'Node is healthy and Mainnet-0 is public-live.' src/index.ts
echo "[ok] public-live source markers present"

echo
echo "=== [2] stale source markers must be gone ==="
if grep -nE 'Mainnet-0 remains preview-only\.|Mainnet-0 preview|NO-GO preview|not public launch|public launch is still NO-GO' src/index.ts; then
  echo "[fail] stale first-60 source copy still present"
  exit 1
fi
echo "[ok] stale first-60 source copy gone"

echo
echo "=== [3] served participant copy ==="
curl -fsS "$BASE/participant" > "$HTML"
grep -q 'Mainnet-0 public-live' "$HTML"
grep -q 'Mainnet-0 is public-live.' "$HTML"
grep -q 'Node is healthy and Mainnet-0 is public-live.' "$HTML"

if grep -nE 'Mainnet-0 remains preview-only\.|Mainnet-0 preview|NO-GO preview|not public launch|public launch is still NO-GO' "$HTML"; then
  echo "[fail] stale first-60 copy still served"
  exit 1
fi
echo "[ok] served first-60 copy updated"

echo
echo "=== [4] unsafe wording guard ==="
if grep -nEi 'guaranteed returns|investment advice|share your seed|share your private key|we can recover your wallet|active validator admission is open|treasury spend is open|authority transfer is open' "$HTML"; then
  echo "[fail] unsafe participant wording found"
  exit 1
fi
echo "[ok] no unsafe participant wording"

echo
echo "=== [5] local status smoke ==="
make mainnet0-status-smoke

echo "=== public participant first-60 copy proof OK ==="
