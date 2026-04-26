#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

echo "=== submit gates proof ==="
echo "[gate] submit path must remain disabled until real wallet execution proof exists"
echo "[gate] public registration must not mutate active validator set"
echo "[gate] draft API must remain non-mutating"
echo "[gate] participant UI must keep guarded shell"
echo

ops/mainnet0/validator-registration-lane-proof.sh

echo
echo "[ok] submit gates are still enforced by current lane proof"
