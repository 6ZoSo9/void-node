#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/vps-public-seed-preflight-v1.md"
SCRIPT="ops/public/vps-public-seed-preflight-v1.sh"

echo "=== VOID VPS public seed preflight v1 proof ==="

test -f "$DOC"
test -x "$SCRIPT"

grep -Fq "Status: pre-deploy proof lane." "$DOC"
grep -Fq "without mutating the VPS" "$DOC"
grep -Fq "must not install packages, write files, change firewall rules, start services" "$DOC"
grep -Fq "VPS_SSH" "$DOC"
grep -Fq "local 8545 must not bind to 0.0.0.0" "$DOC"
grep -Fq "remote 8545 must not be listening publicly" "$DOC"
grep -Fq "no private keys, mnemonics, wallet files, .env files, auth tokens, or runtime secrets are copied" "$DOC"
grep -Fq "Passing this preflight does not mean the VPS is deployed." "$DOC"

grep -Fq "VPS_SSH is not set." "$SCRIPT"
grep -Fq "Local-only preflight passed." "$SCRIPT"
grep -Fq "local 8545 appears public-bound" "$SCRIPT"
grep -Fq "remote 8545 listener detected" "$SCRIPT"
grep -Fq "remote preflight completed without mutation" "$SCRIPT"

if grep -E 'apt(-get)? install|ufw allow|systemctl enable|systemctl start|git clone|scp .*\.env|PRIVATE_KEY|MNEMONIC' "$SCRIPT"; then
  echo "[FAIL] preflight script appears to contain mutating or secret-copy behavior"
  exit 1
fi

if ss -ltnp 2>/dev/null | grep -E '0\.0\.0\.0:8545|\[::\]:8545'; then
  echo "[FAIL] local 8545 appears public-bound"
  exit 1
fi

echo "[ok] VPS preflight doc/script present"
echo "[ok] no mutating install/firewall/service behavior detected"
echo "[ok] local RPC private-bind invariant preserved"
