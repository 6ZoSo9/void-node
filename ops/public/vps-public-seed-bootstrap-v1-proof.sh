#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/vps-public-seed-bootstrap-v1.md"

echo "=== VOID VPS public seed bootstrap v1 proof ==="

test -f "$DOC"

grep -Fq "Status: plan/proof lane." "$DOC"
grep -Fq "Precision remains the canonical builder/prover/operator workstation." "$DOC"
grep -Fq "A VPS should be used as the public bootstrap seed/gateway." "$DOC"
grep -Fq "The VPS is the internet-facing entry point." "$DOC"

grep -Fq "participant UI" "$DOC"
grep -Fq "public readiness/status" "$DOC"
grep -Fq "public bootstrap discovery metadata" "$DOC"
grep -Fq "public DataNet materialized status" "$DOC"

grep -Fq "private JSON-RPC" "$DOC"
grep -Fq "validator mutation/admin endpoints" "$DOC"
grep -Fq "private keys, secrets, wallets, mnemonics, tokens, .env files, or runtime auth" "$DOC"

grep -Fq "8545 must not bind to 0.0.0.0" "$DOC"
grep -Fq "8545 must not be reverse-proxied publicly" "$DOC"
grep -Fq "8545 must not be exposed through router, VPS, nginx, Caddy, SSH tunnel, or Tailscale funnel" "$DOC"

grep -Fq "VPS listens publicly on 80/443 and optionally 4100." "$DOC"
grep -Fq "VPS serves or proxies only allowlisted public routes." "$DOC"
grep -Fq "Public gateway route allowlist is explicit." "$DOC"

if ss -ltnp 2>/dev/null | grep -E '0\.0\.0\.0:8545|\[::\]:8545'; then
  echo "[FAIL] local 8545 appears public-bound"
  exit 1
fi

echo "[ok] VPS public seed bootstrap plan recorded"
echo "[ok] public/private surface boundaries recorded"
echo "[ok] local RPC private-bind invariant preserved"
