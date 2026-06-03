#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet0/participant-wc-to-void.current.md"

echo "=== participant WC -> VOID current status proof ==="

test -f "$DOC"

grep -q 'status: green_temp_wallet_execution_crossbox_status_smoke' "$DOC"
grep -q 'checkpoint: ckpt-wc-to-void-temp-wallet-execution-proof-green-20260602-205459' "$DOC"
grep -q 'head: c62b93f9' "$DOC"

grep -q 'previous_trade_receipt_activity_checkpoint: ckpt-wc-to-void-trade-receipt-activity-green-20260601-084635' "$DOC"
grep -q 'previous_trade_state_copy_checkpoint: ckpt-wc-to-void-trade-state-copy-green-20260601-081303' "$DOC"
grep -q 'previous_readiness_checkpoint: ckpt-participant-wc-to-void-readiness-proof-green-20260601-023517' "$DOC"

grep -q 'Locked participant wallet blocks WC -> VOID execution with `wallet_locked`.' "$DOC"
grep -q 'A temporary proof wallet can execute native wallet WC -> VOID approve+swap on local 2050 Anvil.' "$DOC"
grep -q 'make participant-wc-to-void-temp-wallet-execution-proof' "$DOC"
grep -q 'ops/mainnet0/participant-wc-to-void-temp-wallet-execution-proof.sh' "$DOC"
grep -q '/tmp/wc-to-void-temp-wallet-execution-main-proof-20260602-205554.log' "$DOC"
grep -q '/tmp/wc-to-void-temp-wallet-execution-proof-closeout-20260602-205658.log' "$DOC"
grep -q '/tmp/wc-to-void-temp-wallet-execution-proof-crossbox-closeout-20260602-205854.log' "$DOC"

grep -q 'real_wallet_used: false' "$DOC"
grep -q 'mutation_scope: Precision local 8545 devnet only' "$DOC"
grep -q 'chain_mutation: local_anvil_only' "$DOC"
grep -q 'Buy VOID fulfillment: false' "$DOC"
grep -q 'validator mutation: false' "$DOC"

grep -q 'temp_wallet: 0xC98e49110fF9b0FC88bae6Aa1425959B517972c3' "$DOC"
grep -q 'amount_wc: 1' "$DOC"
grep -q 'quoted_void: 0.009948607111431085' "$DOC"
grep -q 'approve_tx_hash: 0x9dad40018a6e93a924ace9ada261b6213ba52311139c30da4f605ea6d93e9a9f' "$DOC"
grep -q 'swap_tx_hash: 0x6d26e2e0f9cc5fc4e4e1a28362e1f999daec84d3e96135d442ac7dab445129e8' "$DOC"
grep -q 'wc_before_raw: 5000000000000000000' "$DOC"
grep -q 'wc_after_raw: 4000000000000000000' "$DOC"
grep -q 'void_before_raw: 0' "$DOC"
grep -q 'void_after_raw: 10000000000000000' "$DOC"
grep -q 'temp_wallet_locked_after: true' "$DOC"

grep -q 'precision_status_smoke: passed' "$DOC"
grep -q 'alienware_status_smoke: passed' "$DOC"
grep -q 'crossbox_status_smoke: passed' "$DOC"
grep -q 'alienware_temp_wallet_execution_proof: not_run_by_design' "$DOC"
grep -q 'Do not run the local Anvil temp-wallet execution proof on Alienware unless its local 8545 WC devnet is intentionally refreshed first.' "$DOC"

grep -q 'Needs Devnet Gas' "$DOC"
grep -q 'Unlock Native Wallet' "$DOC"
grep -q 'Approve + Swap WC for VOID' "$DOC"
grep -q 'quoted_void' "$DOC"
grep -q 'approve_tx_hash' "$DOC"
grep -q 'swap_tx_hash' "$DOC"
grep -q 'void_wallet_activity_v1' "$DOC"
grep -q 'multi-entry trade history panel' "$DOC"
grep -q 'real-wallet execution behind explicit wallet unlock/sign confirmation' "$DOC"

grep -q 'participant-wallet-wc-to-void-readiness-proof' Makefile
grep -q 'participant-wc-to-void-current-status-proof' Makefile
grep -q 'participant-wc-to-void-temp-wallet-execution-proof' Makefile

test -x ops/mainnet0/participant-wallet-wc-to-void-readiness-proof.sh
test -x ops/mainnet0/participant-wc-to-void-current-status-proof.sh
test -x ops/mainnet0/participant-wc-to-void-temp-wallet-execution-proof.sh

echo "[ok] participant WC -> VOID current status proof passed"
