#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
HTML="/tmp/void-participant-public-copy-proof-$(date +%Y%m%d-%H%M%S).html"

echo "=== public participant copy proof ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [1] source copy markers ==="
grep -q 'Mainnet-0 public-live • guarded actions' src/index.ts
grep -q 'Mainnet-0: public-live' src/index.ts
grep -q 'Node is healthy and Mainnet-0 is public-live.' src/index.ts
grep -q 'Public-live status does not open guarded actions.' src/index.ts
grep -q 'Mainnet-0 note: this balance may include reconciled historical WC credits.' src/index.ts
grep -q 'Historical migrated account selected.' src/index.ts
grep -q 'Advanced account shortcuts' src/index.ts
grep -q 'Wallet diagnostics' src/index.ts

echo
echo "=== [2] stale copy must be gone from source ==="
if grep -nE 'Mainnet-0 preview • not public launch|Public launch: NO-GO preview|public launch is still NO-GO|Beta note:|Legacy migrated/demo account selected|Developer account shortcuts|Helper Wallet Diagnostics' src/index.ts; then
  echo "[fail] stale participant copy still present"
  exit 1
fi
echo "[ok] stale source copy removed"

echo
echo "=== [3] served participant page copy ==="
curl -fsS "$BASE/participant" > "$HTML"
grep -q 'Mainnet-0 public-live' "$HTML"
grep -q 'Mainnet-0: public-live' "$HTML"
grep -q 'Node is healthy and Mainnet-0 is public-live.' "$HTML"

if grep -nE 'Mainnet-0 preview • not public launch|Public launch: NO-GO preview|public launch is still NO-GO|Beta note:' "$HTML"; then
  echo "[fail] stale participant copy still served"
  exit 1
fi

echo "[ok] served participant copy updated"

echo
echo "=== [4] dangerous wording guard ==="
if grep -nEi 'guaranteed returns|investment advice|share your seed|share your private key|we can recover your wallet|active validator admission is open|treasury spend is open|authority transfer is open' "$HTML"; then
  echo "[fail] unsafe participant wording found"
  exit 1
fi
echo "[ok] no unsafe participant wording"

echo
echo "=== [5] local status smoke ==="
make mainnet0-status-smoke

echo "=== public participant copy proof OK ==="
