#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

echo "=== public GitHub landing proof ==="

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] README landing markers ==="
grep -q 'Status: public_mainnet0_live / GO_PUBLIC_MAINNET0' README.md
grep -q 'docs/public/start-here.md' README.md
grep -q 'docs/public/mainnet0-public-live-announcement.md' README.md
grep -q 'docs/public/quick-start.md' README.md
grep -q 'docs/public/windows-wsl2-quick-start.md' README.md
grep -q 'docs/public/support-runbook.md' README.md
grep -q 'docs/public/void-network-whitepaper.md' README.md
grep -q 'Security policy: SECURITY.md' README.md
grep -q 'Contributing guide: CONTRIBUTING.md' README.md
grep -q 'Public active validator admission remains disabled.' README.md
grep -q 'Future treasury spend remains separately guarded.' README.md
echo "[ok] README public landing markers present"

echo
echo "=== [3] public docs index markers ==="
grep -q 'VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0' docs/public/README.md
grep -q 'Public active validator admission remains disabled.' docs/public/README.md
grep -q 'Do not share private keys or seed phrases.' docs/public/README.md
echo "[ok] public docs index markers present"

echo
echo "=== [4] no dangerous overclaim phrases ==="
if grep -RInE \
  'public active validator admission is open|treasury spend is open|Buy VOID fulfillment is open|authority transfer is open|send funds directly|custodial sends supported|guaranteed returns|investment advice|profit guaranteed|fully decentralized and trustless' \
  README.md docs/public SECURITY.md CONTRIBUTING.md; then
  echo "[fail] dangerous overclaim phrase found"
  exit 1
fi
echo "[ok] no dangerous overclaim phrases"

echo
echo "=== [5] baseline proofs ==="
make public-repo-hardening-proof
make public-repo-gitleaks-current-proof
make mainnet0-current-public-status-proof
make mainnet0-public-docs-stack-proof
make mainnet0-status-smoke

echo
echo "=== public GitHub landing proof OK ==="
