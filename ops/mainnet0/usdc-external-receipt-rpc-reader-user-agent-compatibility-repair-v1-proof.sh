#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_USER_AGENT_COMPATIBILITY_REPAIR_V1_PROOF_BEGIN"

reader="ops/mainnet0/usdc-external-receipt-rpc-reader-v1.py"
doc="docs/public/public-node-usdc-external-receipt-rpc-reader-user-agent-compatibility-repair-v1.md"

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

need 'user-agent":"void-node-live-readonly/1.0' "$reader"
need 'VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1' "$reader"
need 'eth_getTransactionReceipt' "$reader"
need 'real_payment_verified_now' "$reader"
need 'finality_verified_now' "$reader"
need 'automatic_fulfillment_enabled' "$reader"
need 'void_transfer_now' "$reader"

need 'VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_USER_AGENT_COMPATIBILITY_REPAIR_V1' "$doc"
need 'Non-activation statement' "$doc"
need 'Adds `user-agent: void-node-live-readonly/1.0`' "$doc"
need 'Does not transfer VOID' "$doc"

rm -f /tmp/usdc-rpc-reader-ua-disabled.json /tmp/usdc-rpc-reader-ua-disabled.err
env -u USDC_EXTERNAL_RPC_URL -u USDC_EXTERNAL_TX_HASH -u USDC_EXTERNAL_CHAIN_ID \
  python3 "$reader" \
  >/tmp/usdc-rpc-reader-ua-disabled.json \
  2>/tmp/usdc-rpc-reader-ua-disabled.err

grep -qF 'VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1_DISABLED_GREEN' /tmp/usdc-rpc-reader-ua-disabled.err

python3 - <<'PY'
import json
from pathlib import Path
data=json.loads(Path("/tmp/usdc-rpc-reader-ua-disabled.json").read_text())
assert data["marker"] == "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1"
assert data["reader_mode"] == "disabled_missing_env"
assert data["required_env_present"] is False
assert data["receipt_fetch_attempted"] is False
assert data["live_chain_data"] is False
assert data["external_chain_rpc_fetch_enabled"] is False
for key in [
    "real_payment_verified_now",
    "finality_verified_now",
    "external_state_root_trust_enabled",
    "automatic_fulfillment_enabled",
    "private_allocation_ledger_write_enabled",
    "inventory_reserved_now",
    "void_transfer_now",
    "public_mutation_enabled",
]:
    assert data[key] is False, key
print("disabled_mode_authority_false_green=true")
PY

rm -f /tmp/usdc-rpc-reader-ua-live.json /tmp/usdc-rpc-reader-ua-live.err
env \
  USDC_EXTERNAL_RPC_URL="https://mainnet.base.org" \
  USDC_EXTERNAL_CHAIN_ID="8453" \
  USDC_EXTERNAL_TX_HASH="0xaf6ce2cba0492b0a257d7fdf082c865891049a378181281bf084e0b0f7c2f857" \
  timeout 25s python3 "$reader" \
  >/tmp/usdc-rpc-reader-ua-live.json \
  2>/tmp/usdc-rpc-reader-ua-live.err

grep -qF 'VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1_LIVE_READ_ONLY_GREEN' /tmp/usdc-rpc-reader-ua-live.err

python3 - <<'PY'
import json
from pathlib import Path
data=json.loads(Path("/tmp/usdc-rpc-reader-ua-live.json").read_text())
assert data["marker"] == "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1"
assert data["reader_mode"] == "live_read_only"
assert data["required_env_present"] is True
assert data["live_chain_data"] is True
assert data["external_chain_rpc_fetch_enabled"] is True
assert data["receipt_fetch_attempted"] is True
assert data["receipt_found"] is True
assert data["receipt_status"] == "0x1"
assert int(data["block_number"]) > 0
assert int(data["transfer_log_count"]) >= 1
assert int(data["matching_transfer_log_count"]) >= 1
for key in [
    "real_payment_verified_now",
    "finality_verified_now",
    "external_state_root_trust_enabled",
    "automatic_fulfillment_enabled",
    "private_allocation_ledger_write_enabled",
    "inventory_reserved_now",
    "void_transfer_now",
    "public_mutation_enabled",
]:
    assert data[key] is False, key
print("live_read_only_receipt_observation_green=true")
print("live_read_only_authority_false_green=true")
PY

bad 'real_payment_verified_now": true' /tmp/usdc-rpc-reader-ua-live.json
bad 'finality_verified_now": true' /tmp/usdc-rpc-reader-ua-live.json
bad 'automatic_fulfillment_enabled": true' /tmp/usdc-rpc-reader-ua-live.json
bad 'void_transfer_now": true' /tmp/usdc-rpc-reader-ua-live.json

echo "user_agent_header_source_green=true"
echo "disabled_mode_green=true"
echo "free_base_rpc_live_read_only_green=true"
echo "authority_false_green=true"
echo "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_USER_AGENT_COMPATIBILITY_REPAIR_V1_GREEN"
