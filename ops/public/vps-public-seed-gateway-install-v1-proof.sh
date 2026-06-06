#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/vps-public-seed-gateway-install-plan-v1.md"
SCRIPT="ops/public/vps-public-seed-gateway-install-v1.sh"

echo "=== VOID VPS public seed gateway install plan v1 proof ==="

test -f "$DOC"
test -x "$SCRIPT"

grep -Fq "Status: gated install plan." "$DOC"
grep -Fq "Precision remains the canonical builder/prover/operator workstation." "$DOC"
grep -Fq "VOID_VPS_INSTALL_CONFIRM=INSTALL_VOID_PUBLIC_SEED_GATEWAY_V1" "$DOC"
grep -Fq "The install script must default to dry-run / refusal mode." "$DOC"
grep -Fq "The VPS serves only allowlisted public surfaces." "$DOC"
grep -Fq "copy private keys" "$DOC"
grep -Fq "reverse-proxy 8545" "$DOC"
grep -Fq "open 8545" "$DOC"
grep -Fq "move funds" "$DOC"
grep -Fq "perform validator admission" "$DOC"
grep -Fq "/__void/public-bootstrap.json" "$DOC"
grep -Fq "/datanet/materialized-status" "$DOC"
grep -Fq "any direct or proxied 8545 access" "$DOC"

grep -Fq "CONFIRM_REQUIRED=\"INSTALL_VOID_PUBLIC_SEED_GATEWAY_V1\"" "$SCRIPT"
grep -Fq "[REFUSE] installer is gated and made no changes" "$SCRIPT"
grep -Fq "VPS_SSH is required for confirmed install" "$SCRIPT"
grep -Fq "remote 8545 listener detected; refusing install" "$SCRIPT"
grep -Fq "This v1 script intentionally stops before mutation." "$SCRIPT"
grep -Fq "no remote mutation performed in v1" "$SCRIPT"

if grep -E 'apt(-get)? install|ufw allow|systemctl enable|systemctl start|git clone|scp .*\.env|PRIVATE_KEY|MNEMONIC|cast send|sendToOps|spend\(' "$SCRIPT"; then
  echo "[FAIL] v1 installer contains mutating install, secret-copy, funds, or authority behavior"
  exit 1
fi

if ss -ltnp 2>/dev/null | grep -E '0\.0\.0\.0:8545|\[::\]:8545'; then
  echo "[FAIL] local 8545 appears public-bound"
  exit 1
fi

echo "[ok] gated install plan recorded"
echo "[ok] installer refusal gate recorded"
echo "[ok] no mutation/secret/funds/authority behavior detected"
echo "[ok] local RPC private-bind invariant preserved"
