#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/home-public-reachability-v1.md"

echo "=== VOID home public reachability v1 proof ==="

test -f "$DOC"

grep -Fq "Status: home-direct public reachability not proven." "$DOC"
grep -Fq "ckpt-public-bootstrap-gateway-routes-v1-green-20260606-084040" "$DOC"
grep -Fq "ready: true" "$DOC"
grep -Fq "gap: 0" "$DOC"
grep -Fq "txroot_live: 1" "$DOC"
grep -Fq "4100 bound on 0.0.0.0" "$DOC"
grep -Fq "4700 bound on 0.0.0.0" "$DOC"
grep -Fq "8545 bound on 127.0.0.1 only" "$DOC"
grep -Fq "observed_only_local_or_tailscale=true" "$DOC"
grep -Fq "Precision remains the source-of-truth builder/prover." "$DOC"
grep -Fq "VPS: public bootstrap gateway / public seed." "$DOC"
grep -Fq "8545 must not bind to 0.0.0.0" "$DOC"
grep -Fq "8545 must not be exposed through router/VPS/public gateway" "$DOC"

if ss -ltnp 2>/dev/null | grep -E '0\.0\.0\.0:8545|\[::\]:8545'; then
  echo "[FAIL] 8545 appears public-bound"
  exit 1
fi

echo "[ok] home public reachability result recorded"
echo "[ok] RPC private-bind invariant preserved"
