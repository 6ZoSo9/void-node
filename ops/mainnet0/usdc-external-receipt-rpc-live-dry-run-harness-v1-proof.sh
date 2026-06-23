set -euo pipefail
echo "VOID_USDC_EXTERNAL_RECEIPT_RPC_LIVE_DRY_RUN_HARNESS_V1_PROOF_BEGIN"
src=src/index.ts
doc=docs/public/public-node-usdc-external-receipt-rpc-live-dry-run-harness-v1.md
harness=ops/mainnet0/usdc-external-receipt-rpc-live-dry-run-harness-v1.sh
reader=ops/mainnet0/usdc-external-receipt-rpc-reader-v1.py
need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }
test "$(grep -F "runtimeApp.get(\"/public-node/usdc-void-buy-pool/external-receipt-rpc-live-dry-run-harness-v1.json\"" "$src" | wc -l)" = "1"
bash "$harness" >/tmp/live-dry-run-harness-proof.out 2>/tmp/live-dry-run-harness-proof.err
need "VOID_USDC_EXTERNAL_RECEIPT_RPC_LIVE_DRY_RUN_HARNESS_V1_GREEN" /tmp/live-dry-run-harness-proof.out
need "live_env_present=false" /tmp/live-dry-run-harness-proof.out
need "live_dry_run_reader_invocation_green=true" /tmp/live-dry-run-harness-proof.out
need "live_dry_run_observation_only_green=true" /tmp/live-dry-run-harness-proof.out
need "live_dry_run_authority_false_green=true" /tmp/live-dry-run-harness-proof.out
need "VOID_USDC_EXTERNAL_RECEIPT_RPC_LIVE_DRY_RUN_HARNESS_V1" "$src"
need "/public-node/usdc-void-buy-pool/external-receipt-rpc-live-dry-run-harness-v1.json" "$src"
need "live_dry_run_harness_defined_disabled_by_default_authority_false" "$src"
need "default_no_env_mode_green: true" "$src"
need "requires_explicit_env" "$src"
need "USDC_EXTERNAL_RPC_URL" "$src"
need "USDC_EXTERNAL_TX_HASH" "$src"
need "can_invoke_live_read_only_receipt_reader_when_explicitly_configured: true" "$src"
need "observation_only_boundary: true" "$src"
need "live_chain_data_default: false" "$src"
need "external_chain_rpc_fetch_enabled_default: false" "$src"
need "receipt_fetch_attempted_default: false" "$src"
need "real_payment_verified_now: false" "$src"
need "finality_verified_now: false" "$src"
need "automatic_fulfillment_enabled: false" "$src"
need "private_allocation_ledger_write_enabled: false" "$src"
need "inventory_reserved_now: false" "$src"
need "void_transfer_now: false" "$src"
need "VOID_USDC_EXTERNAL_RECEIPT_RPC_LIVE_DRY_RUN_HARNESS_V1" "$doc"
need "Default proof mode is no-env and must remain disabled/no-authority" "$doc"
need "observation-only output" "$doc"
need "VOID_USDC_EXTERNAL_RECEIPT_RPC_LIVE_DRY_RUN_HARNESS_V1_BEGIN" "$harness"
need "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1_LIVE_READ_ONLY_GREEN" "$harness"
need "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1_DISABLED_GREEN" "$harness"
need "eth_getTransactionReceipt" "$reader"
bad "real_payment_verified_now: true" "$src"
bad "finality_verified_now: true" "$src"
bad "automatic_fulfillment_enabled: true" "$src"
bad "private_allocation_ledger_write_enabled: true" "$src"
bad "inventory_reserved_now: true" "$src"
bad "void_transfer_now: true" "$src"
echo "live_dry_run_harness_default_green=true"
echo "live_dry_run_harness_route_duplicate_count_green=true"
echo "live_dry_run_harness_source_green=true"
echo "live_dry_run_harness_authority_false_green=true"
echo "VOID_USDC_EXTERNAL_RECEIPT_RPC_LIVE_DRY_RUN_HARNESS_V1_GREEN"
