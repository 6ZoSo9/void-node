set -euo pipefail
echo "VOID_USDC_EXTERNAL_RECEIPT_RPC_LIVE_DRY_RUN_HARNESS_V1_BEGIN"
reader=ops/mainnet0/usdc-external-receipt-rpc-reader-v1.py
out=${VOID_RPC_LIVE_DRY_RUN_OUT:-/tmp/usdc-external-receipt-rpc-live-dry-run-harness-v1.json}
err=${VOID_RPC_LIVE_DRY_RUN_ERR:-/tmp/usdc-external-receipt-rpc-live-dry-run-harness-v1.err}
pretty=${VOID_RPC_LIVE_DRY_RUN_PRETTY:-/tmp/usdc-external-receipt-rpc-live-dry-run-harness-v1.pretty}
need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
if [ -n "${USDC_EXTERNAL_RPC_URL:-}" ] && [ -n "${USDC_EXTERNAL_TX_HASH:-}" ]; then
 echo "live_env_present=true"
 python3 "$reader" > "$out" 2> "$err"
 need "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1_LIVE_READ_ONLY_GREEN" "$err"
else
 echo "live_env_present=false"
 env -u USDC_EXTERNAL_RPC_URL -u USDC_EXTERNAL_TX_HASH python3 "$reader" > "$out" 2> "$err"
 need "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1_DISABLED_GREEN" "$err"
fi
python3 -m json.tool "$out" > "$pretty"
need "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1" "$pretty"
need "\"real_payment_verified_now\": false" "$pretty"
need "\"finality_verified_now\": false" "$pretty"
need "\"external_state_root_trust_enabled\": false" "$pretty"
need "\"automatic_fulfillment_enabled\": false" "$pretty"
need "\"private_allocation_ledger_write_enabled\": false" "$pretty"
need "\"inventory_reserved_now\": false" "$pretty"
need "\"void_transfer_now\": false" "$pretty"
need "\"public_mutation_enabled\": false" "$pretty"
echo "live_dry_run_reader_invocation_green=true"
echo "live_dry_run_observation_only_green=true"
echo "live_dry_run_authority_false_green=true"
echo "VOID_USDC_EXTERNAL_RECEIPT_RPC_LIVE_DRY_RUN_HARNESS_V1_GREEN"
