#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

src="src/index.ts"
receipt_json="docs/public/public-node-wc-to-void-redacted-settlement-receipt-v1.json"
receipt_doc="docs/public/public-node-wc-to-void-redacted-settlement-receipt-v1.md"

test -f "$src"
test -f "$receipt_json"
test -f "$receipt_doc"

grep -F 'VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_RUNTIME_V1' "$src" >/dev/null
grep -F '/public-node/wc-to-void/redacted-settlement-receipt-v1.json' "$src" >/dev/null
grep -F '/public-node/wc-to-void/redacted-settlement-receipt-v1' "$src" >/dev/null
grep -F 'VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_V1' "$src" >/dev/null
grep -F 'does_not_create_public_mutation' "$src" >/dev/null
grep -F 'does_not_read_private_key' "$src" >/dev/null
grep -F 'plaintext_addresses_redacted' "$src" >/dev/null

python3 - <<'PY'
import json
import re
from pathlib import Path

src_path = Path("src/index.ts")
src = src_path.read_text()
receipt = json.loads(Path("docs/public/public-node-wc-to-void-redacted-settlement-receipt-v1.json").read_text())

marker = "VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_RUNTIME_V1"
json_route = 'app.get("/public-node/wc-to-void/redacted-settlement-receipt-v1.json"'
html_route = 'app.get("/public-node/wc-to-void/redacted-settlement-receipt-v1"'

assert marker in src
assert json_route in src
assert html_route in src

start = src.index(marker)

# The source layout may place this block after export default app, so do not require
# another export anchor after the marker. Scope to marker→EOF, then assert the expected
# routes are inside that scoped region.
runtime_block = src[start:]

assert receipt["marker"] == "VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_V1"
assert receipt["tx_hash"] in runtime_block
assert receipt["settlement_record_key"] in runtime_block
assert marker in runtime_block
assert json_route in runtime_block
assert html_route in runtime_block

for forbidden in [
    "PRIVATE_KEY=",
    "MNEMONIC=",
    "BEGIN PRIVATE KEY",
    "seed phrase:",
    "cast send",
    "eth_sendRawTransaction",
    "personal_sendTransaction",
]:
    assert forbidden not in runtime_block, forbidden

addr_re = re.compile(r"0x[a-fA-F0-9]{40}(?![a-fA-F0-9])")
for path in [
    Path("docs/public/public-node-wc-to-void-redacted-settlement-receipt-v1.json"),
    Path("docs/public/public-node-wc-to-void-redacted-settlement-receipt-v1.md"),
]:
    assert not addr_re.search(path.read_text()), f"plaintext EVM address found in {path}"

assert receipt["closed_boundaries"]["read_only_public_receipt"] is True
assert receipt["closed_boundaries"]["does_not_execute_command"] is True
assert receipt["closed_boundaries"]["does_not_broadcast_tx"] is True
assert receipt["closed_boundaries"]["does_not_send_void"] is True
assert receipt["closed_boundaries"]["does_not_call_rpc"] is True
assert receipt["closed_boundaries"]["does_not_read_private_key"] is True
assert receipt["closed_boundaries"]["does_not_create_public_mutation"] is True

print("VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_RUNTIME_V1_JSON_ASSERT_GREEN")
PY

bash ops/mainnet0/wc-to-void-redacted-settlement-receipt-v1-proof.sh >/tmp/void-wc-to-void-redacted-settlement-receipt-runtime-v1-receipt-proof.out
grep -F 'VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_V1_PROOF_GREEN' /tmp/void-wc-to-void-redacted-settlement-receipt-runtime-v1-receipt-proof.out >/dev/null

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-wc-to-void-redacted-settlement-receipt-runtime-v1-mutation.out
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' /tmp/void-wc-to-void-redacted-settlement-receipt-runtime-v1-mutation.out >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' /tmp/void-wc-to-void-redacted-settlement-receipt-runtime-v1-mutation.out >/dev/null

echo "VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_RUNTIME_V1_PROOF_GREEN"
