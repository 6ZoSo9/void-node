#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/vps-public-seed-remote-proof-v1.md"
SCRIPT="ops/public/vps-public-seed-remote-proof-v1.sh"

echo "=== VOID VPS public seed remote proof v1 proof ==="

test -f "$DOC"
test -x "$SCRIPT"

grep -Fq "Status: remote public proof harness." "$DOC"
grep -Fq "VOID_PUBLIC_BASE" "$DOC"
grep -Fq "/__void/ready.json" "$DOC"
grep -Fq "/__void/public-bootstrap.json" "$DOC"
grep -Fq "/datanet/materialized-status" "$DOC"
grep -Fq "/rpc" "$DOC"
grep -Fq "/admin" "$DOC"
grep -Fq "/operator" "$DOC"
grep -Fq "8545 must not be reachable publicly" "$DOC"
grep -Fq "proof must be read-only" "$DOC"
grep -Fq "proof must not send funds" "$DOC"
grep -Fq "proof must not perform validator admission" "$DOC"

grep -Fq "VOID_PUBLIC_BASE is not set." "$SCRIPT"
grep -Fq "Local-only placeholder proof passed." "$SCRIPT"
grep -Fq "BLOCKED_ROUTES" "$SCRIPT"
grep -Fq "blocked_routes_returning_200" "$SCRIPT"
grep -Fq "tcp/8545 reachable on public host" "$SCRIPT"
grep -Fq "no expected public routes reachable" "$SCRIPT"
grep -Fq "remote public seed proof completed" "$SCRIPT"

if grep -E 'apt(-get)? install|ufw allow|systemctl enable|systemctl start|git clone|scp .*\.env|PRIVATE_KEY|MNEMONIC|cast send|sendToOps|spend\(' "$SCRIPT"; then
  echo "[FAIL] remote proof contains mutating install, secret-copy, funds, or authority behavior"
  exit 1
fi

if ss -ltnp 2>/dev/null | grep -E '0\.0\.0\.0:8545|\[::\]:8545'; then
  echo "[FAIL] local 8545 appears public-bound"
  exit 1
fi

echo "[ok] remote proof doc/script present"
echo "[ok] read-only public/private route checks recorded"
echo "[ok] no mutation/secret/funds/authority behavior detected"
echo "[ok] local RPC private-bind invariant preserved"
