#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_CHAIN_TOKEN_RECEIVER_ALLOWLIST_GATE_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-chain-token-receiver-allowlist-gate-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-chain-token-receiver-allowlist-gate-v1.json"

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

marker="VOID_USDC_VOID_BUY_POOL_CHAIN_TOKEN_RECEIVER_ALLOWLIST_GATE_V1"
receiver="0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5"
old_receiver="0x45dd104e3f7cc2a080f2eda094d011d09c51960b"
eth_usdc="0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
base_usdc="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"

need "$marker" "$doc"
need "chain_token_receiver_allowlist_gate_green: true" "$doc"
need "$receiver" "$doc"
need "$old_receiver" "$doc"
need "$eth_usdc" "$doc"
need "$base_usdc" "$doc"
need "does not enable automatic fulfillment" "$doc"

need "$marker" "$fixture"
need "\"chain_token_receiver_allowlist_gate_green\": true" "$fixture"
need "\"chain_allowlist_green\": true" "$fixture"
need "\"token_allowlist_green\": true" "$fixture"
need "\"receiver_allowlist_green\": true" "$fixture"
need "\"automatic_fulfillment_enabled_now\": false" "$fixture"
need "\"overall_automatic_activation_state\": \"still_blocked_other_gates_pending\"" "$fixture"
need "\"chain_id\": 1" "$fixture"
need "\"chain_id\": 8453" "$fixture"
need "$receiver" "$fixture"
need "$old_receiver" "$fixture"
need "$eth_usdc" "$fixture"
need "$base_usdc" "$fixture"
need "\"public_mutation_enabled\": false" "$fixture"
need "\"runtime_queue_enabled\": false" "$fixture"
need "\"live_fetch_now\": false" "$fixture"
need "\"finality_verified_now\": false" "$fixture"
need "\"real_payment_verified_now\": false" "$fixture"
need "\"automatic_fulfillment_enabled\": false" "$fixture"
need "\"private_allocation_ledger_write_enabled\": false" "$fixture"
need "\"inventory_reserved_now\": false" "$fixture"
need "\"void_transfer_now\": false" "$fixture"

need "$marker" "$src"
need "/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1.json" "$src"
need "/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1" "$src"
need "chain_token_receiver_allowlist_gate_green: true" "$src"
need "chain_allowlist_green: true" "$src"
need "token_allowlist_green: true" "$src"
need "receiver_allowlist_green: true" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "overall_automatic_activation_state: \"still_blocked_other_gates_pending\"" "$src"
need "$receiver" "$src"
need "$old_receiver" "$src"
need "$eth_usdc" "$src"
need "$base_usdc" "$src"
need "public_mutation_enabled: false" "$src"
need "runtime_queue_enabled: false" "$src"
need "live_fetch_now: false" "$src"
need "finality_verified_now: false" "$src"
need "real_payment_verified_now: false" "$src"
need "automatic_fulfillment_enabled: false" "$src"
need "private_allocation_ledger_write_enabled: false" "$src"
need "inventory_reserved_now: false" "$src"
need "void_transfer_now: false" "$src"

test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1.json",' "$src" | wc -l)" = "1"
test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1",' "$src" | wc -l)" = "1"

bad "automatic_fulfillment_enabled_now: true" "$src"
bad "automatic_fulfillment_enabled: true" "$src"
bad "private_allocation_ledger_write_enabled: true" "$src"
bad "inventory_reserved_now: true" "$src"
bad "void_transfer_now: true" "$src"
bad "\"automatic_fulfillment_enabled_now\": true" "$fixture"
bad "\"automatic_fulfillment_enabled\": true" "$fixture"
bad "\"private_allocation_ledger_write_enabled\": true" "$fixture"
bad "\"inventory_reserved_now\": true" "$fixture"
bad "\"void_transfer_now\": true" "$fixture"

python3 - "$fixture" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))

assert j["chain_token_receiver_allowlist_gate_green"] is True
assert j["chain_allowlist_green"] is True
assert j["token_allowlist_green"] is True
assert j["receiver_allowlist_green"] is True
assert j["automatic_fulfillment_enabled_now"] is False
assert j["overall_automatic_activation_state"] == "still_blocked_other_gates_pending"

chain_ids = sorted(c["chain_id"] for c in j["allowed_chains"])
assert chain_ids == [1, 8453], chain_ids

tokens = {(t["chain_id"], t["token_address"], t["decimals"]) for t in j["allowed_tokens"]}
assert (1, "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 6) in tokens
assert (8453, "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", 6) in tokens

allowed_receivers = [r["receiver_address"] for r in j["allowed_receivers"]]
blocked_receivers = [r["receiver_address"] for r in j["blocked_receivers"]]
assert allowed_receivers == ["0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5"], allowed_receivers
assert "0x45dd104e3f7cc2a080f2eda094d011d09c51960b" in blocked_receivers
assert "0x45dd104e3f7cc2a080f2eda094d011d09c51960b" not in allowed_receivers

for k, v in j["authority_flags"].items():
    assert v is False, (k, v)

print("chain_token_receiver_allowlist_json_semantics_green=true")
PY

echo "chain_token_receiver_allowlist_source_green=true"
echo "chain_token_receiver_allowlist_fixture_green=true"
echo "chain_token_receiver_allowlist_routes_green=true"
echo "chain_token_receiver_allowlist_gate_green=true"
echo "chain_token_receiver_allowlist_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_CHAIN_TOKEN_RECEIVER_ALLOWLIST_GATE_V1_GREEN"
