set -euo pipefail
echo "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1_PROOF_BEGIN"
src=src/index.ts
doc=docs/public/public-node-usdc-external-receipt-rpc-reader-v1.md
reader=ops/mainnet0/usdc-external-receipt-rpc-reader-v1.py
need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }
test "$(grep -F "runtimeApp.get(\"/public-node/usdc-void-buy-pool/external-receipt-rpc-reader-v1.json\"" "$src" | wc -l)" = "1"
python3 "$reader" >/tmp/rpc-reader-disabled.json 2>/tmp/rpc-reader-disabled.err
grep -qF "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1_DISABLED_GREEN" /tmp/rpc-reader-disabled.err
python3 -m json.tool /tmp/rpc-reader-disabled.json >/tmp/rpc-reader-disabled.pretty
need "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1" /tmp/rpc-reader-disabled.pretty
need "rpc_reader_disabled_missing_env_authority_false" /tmp/rpc-reader-disabled.pretty
need "\"external_chain_rpc_fetch_enabled\": false" /tmp/rpc-reader-disabled.pretty
need "\"receipt_fetch_attempted\": false" /tmp/rpc-reader-disabled.pretty
need "\"real_payment_verified_now\": false" /tmp/rpc-reader-disabled.pretty
need "\"finality_verified_now\": false" /tmp/rpc-reader-disabled.pretty
need "\"automatic_fulfillment_enabled\": false" /tmp/rpc-reader-disabled.pretty
need "\"void_transfer_now\": false" /tmp/rpc-reader-disabled.pretty
need "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1" "$src"
need "/public-node/usdc-void-buy-pool/external-receipt-rpc-reader-v1.json" "$src"
need "rpc_reader_defined_disabled_by_default_authority_false" "$src"
need "reader_default_disabled_green: true" "$src"
need "USDC_EXTERNAL_RPC_URL" "$src"
need "USDC_EXTERNAL_TX_HASH" "$src"
need "can_call_eth_getTransactionReceipt_when_explicitly_configured: true" "$src"
need "can_normalize_erc20_transfer_logs: true" "$src"
need "live_chain_data_default: false" "$src"
need "external_chain_rpc_fetch_enabled_default: false" "$src"
need "receipt_fetch_attempted_default: false" "$src"
need "finality_verified_now: false" "$src"
need "external_state_root_trust_enabled: false" "$src"
need "real_payment_verified_now: false" "$src"
need "automatic_fulfillment_enabled: false" "$src"
need "private_allocation_ledger_write_enabled: false" "$src"
need "inventory_reserved_now: false" "$src"
need "void_transfer_now: false" "$src"
need "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1" "$doc"
need "first live external-chain observation boundary" "$doc"
need "Default mode is disabled unless explicit environment variables are supplied" "$doc"
need "eth_getTransactionReceipt" "$reader"
need "TRANSFER_TOPIC0" "$reader"
need "matching_transfer_logs" "$reader"
need "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1_LIVE_READ_ONLY_GREEN" "$reader"
bad "finality_verified_now: true" "$src"
bad "external_state_root_trust_enabled: true" "$src"
bad "real_payment_verified_now: true" "$src"
bad "automatic_fulfillment_enabled: true" "$src"
bad "private_allocation_ledger_write_enabled: true" "$src"
bad "inventory_reserved_now: true" "$src"
bad "void_transfer_now: true" "$src"
echo "rpc_reader_disabled_default_green=true"
echo "rpc_reader_source_green=true"
echo "rpc_reader_route_duplicate_count_green=true"
echo "rpc_reader_authority_false_green=true"
echo "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1_GREEN"
