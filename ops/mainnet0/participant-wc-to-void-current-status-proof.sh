#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet0/participant-wc-to-void.current.md"

echo "=== participant WC -> VOID current status proof ==="

test -f "$DOC"

grep -q 'status: green_precision_local' "$DOC"
grep -q 'ckpt-wc-to-void-trade-state-copy-green-20260601-081303' "$DOC"
grep -q 'head: 4ed40f5f' "$DOC"
grep -q 'previous_readiness_checkpoint: ckpt-participant-wc-to-void-readiness-proof-green-20260601-023517' "$DOC"
grep -q 'previous_readiness_head: c3f3da96' "$DOC"
grep -q 'Precision_local_devnet_only' "$DOC"
grep -q 'amount_wc: 1' "$DOC"
grep -q 'approve_tx_hash: 0xeba1adf1b0b719291cdd5d7acad4ab59b3b70dbc91000bf8c2ba28ef4d573b6e' "$DOC"
grep -q 'swap_tx_hash: 0xbc5299681673daf67543cf247dec8b86955ba1c337a75dfdfab2f5c6fba5eb6a' "$DOC"
grep -q 'mutation: false' "$DOC"
grep -q 'make participant-wallet-wc-to-void-readiness-proof' "$DOC"
grep -q 'Alienware local Anvil wallet is intentionally funded' "$DOC"
grep -q 'alienware_proof_not_run: true' "$DOC"
grep -q 'local_anvil_wallet_unfunded_native_gas_0' "$DOC"
grep -q 'Needs Devnet Gas' "$DOC"
grep -q 'Unlock Native Wallet' "$DOC"
grep -q 'Approve + Swap WC for VOID' "$DOC"
grep -q '/tmp/wc-to-void-trade-state-copy-crossbox-closeout-20260601-082646.log' "$DOC"
grep -q 'WC→VOID state: Needs Devnet Gas' "$DOC"
grep -q 'WC→VOID state: Unlock Native Wallet' "$DOC"
grep -q 'WC→VOID state: Approve + Swap WC for VOID' "$DOC"
grep -q 'WC -> VOID is closed for this lane.' "$DOC"
grep -q 'trade history/receipt panel' "$DOC"

grep -q 'participant-wallet-wc-to-void-readiness-proof' Makefile
test -x ops/mainnet0/participant-wallet-wc-to-void-readiness-proof.sh

echo "[ok] participant WC -> VOID current status proof passed"
