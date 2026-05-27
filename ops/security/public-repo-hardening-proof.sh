#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

echo "=== public repo hardening proof ==="

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] required GitHub-facing files ==="
test -f README.md
test -f SECURITY.md
test -f CONTRIBUTING.md
test -f LICENSE
test -f .gitignore
test -f docs/public/README.md
test -f docs/public/start-here.md
test -f docs/public/mainnet0-current-public-status.md
test -f docs/public/mainnet0-public-live-announcement.md
echo "[ok] required public repo files exist"

echo
echo "=== [3] SECURITY.md markers ==="
grep -q 'Do not open a public GitHub issue containing' SECURITY.md
grep -q 'private keys' SECURITY.md
grep -q 'seed phrases' SECURITY.md
grep -q 'Public Mainnet-0 security posture' SECURITY.md
grep -q 'public active validator admission' SECURITY.md
grep -q 'treasury spend' SECURITY.md
grep -q 'Buy VOID fulfillment' SECURITY.md
grep -q 'authority transfer' SECURITY.md
grep -q 'assume it is burned and rotate it' SECURITY.md
echo "[ok] SECURITY.md markers present"

echo
echo "=== [4] CONTRIBUTING.md markers ==="
grep -q 'Do not commit secrets' CONTRIBUTING.md
grep -q 'Mainnet-0 guardrails' CONTRIBUTING.md
grep -q 'Preferred development flow' CONTRIBUTING.md
grep -q 'make mainnet0-current-public-status-proof' CONTRIBUTING.md
grep -q 'make mainnet0-status-smoke' CONTRIBUTING.md
grep -q 'Safe wording:' CONTRIBUTING.md
echo "[ok] CONTRIBUTING.md markers present"

echo
echo "=== [5] .gitignore secret-safety patterns ==="
for pat in \
  '.env' \
  '.env.*' \
  '*.pem' \
  '*.key' \
  'id_rsa' \
  'id_ed25519' \
  '*.ppk' \
  '*.p12' \
  '*.pfx' \
  'cache/' \
  '.cache/' \
  '*.seed' \
  '*.mnemonic' \
  '*.keystore' \
  '*.wallet'
do
  grep -qF "$pat" .gitignore
done
echo "[ok] .gitignore secret-safety patterns present"

echo
echo "=== [6] no PEM private key blocks in current HEAD tracked files ==="
if git grep -nI -E -- '-----BEGIN (RSA |OPENSSH |EC |DSA |ED25519 )?PRIVATE KEY-----' -- .; then
  echo "[fail] PEM private key block found in current HEAD"
  exit 1
fi
echo "[ok] no PEM private key blocks in current HEAD"

echo
echo "=== [7] public baseline still green ==="
make mainnet0-current-public-status-proof
make mainnet0-public-live-announcement-proof
make mainnet0-status-smoke

echo
echo "=== public repo hardening proof OK ==="
