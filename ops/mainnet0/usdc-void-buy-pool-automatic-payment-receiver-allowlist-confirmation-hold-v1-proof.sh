#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_RECEIVER_ALLOWLIST_CONFIRMATION_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-automatic-payment-receiver-allowlist-confirmation-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-receiver-allowlist-confirmation-hold-v1.json"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_RECEIVER_ALLOWLIST_CONFIRMATION_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -F "$marker" "$doc" >/dev/null
grep -F "No public route is allowed" "$doc" >/dev/null
grep -F "receiver value: private / withheld / required before activation" "$doc" >/dev/null
grep -F "automatic payment execution: false" "$doc" >/dev/null
grep -F "automatic fulfillment: false" "$doc" >/dev/null
grep -F "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" "$doc" >/dev/null
grep -F "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" "$doc" >/dev/null
grep -F "bridged USDbC receiver" "$doc" >/dev/null

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-automatic-payment-receiver-allowlist-confirmation-hold-v1.json", "utf8"));

function assert(x, msg){ if(!x){ throw new Error(msg); } }

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_RECEIVER_ALLOWLIST_CONFIRMATION_HOLD_V1", "bad marker");
assert(fixture.scope === "private_receiver_allowlist_confirmation_hold", "bad scope");
assert(fixture.status.packet_state === "hold_only_not_approved", "packet must be hold only");
assert(fixture.status.receiver_allowlist_confirmed === false, "receiver allowlist must not be confirmed yet");
assert(fixture.status.ethereum_receiver_present === false, "ethereum receiver must not be present yet");
assert(fixture.status.base_receiver_present === false, "base receiver must not be present yet");
assert(fixture.privacy.private_packet === true, "must be private");
assert(fixture.privacy.public_route_allowed === false, "public route must be disallowed");
assert(fixture.privacy.contains_receiver_address === false, "must not contain receiver address");

assert(Array.isArray(fixture.required_private_receiver_slots) && fixture.required_private_receiver_slots.length === 2, "must define exactly two receiver slots");

const slots = new Set(fixture.required_private_receiver_slots.map(a => `${a.chain_id}:${a.token_contract_lowercase}:${a.decimals}:${a.receiver_value}:${a.receiver_publicly_disclosed}`));
assert(slots.has("1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48:6:withheld_required_before_activation:false"), "missing ethereum receiver slot");
assert(slots.has("8453:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913:6:withheld_required_before_activation:false"), "missing base receiver slot");

for (const rejected of [
  "public_receiver_publication",
  "missing_receiver",
  "wrong_chain_receiver",
  "wrong_token_receiver",
  "ambiguous_shared_receiver_without_explicit_operator_confirmation",
  "bridged_usdbc_receiver",
  "testnet_receiver"
]) {
  assert(fixture.rejected_receiver_states.includes(rejected), `missing rejected receiver state ${rejected}`);
}

for (const required of [
  "explicit_operator_receiver_confirmation_record",
  "receiver_address_format_validation",
  "receiver_chain_binding_validation",
  "receiver_token_binding_validation",
  "private_receiver_no_leak_proof",
  "cross_box_receiver_allowlist_dry_run",
  "final_precision_sync"
]) {
  assert(fixture.required_before_activation.includes(required), `missing ${required}`);
}

for (const [k, v] of Object.entries(fixture.authority)) {
  assert(v === false, `authority ${k} must be false`);
}
for (const k of [
  "automatic_payment_execution_enabled",
  "automatic_fulfillment_enabled",
  "wallet_signing_enabled",
  "treasury_movement_enabled",
  "void_transfer_enabled",
  "public_mutation_enabled"
]) {
  assert(fixture.status[k] === false, `status ${k} must be false`);
}
for (const k of [
  "contains_receiver_address",
  "contains_wallet_secret",
  "contains_private_key",
  "contains_seed_phrase",
  "contains_buyer_private_data"
]) {
  assert(fixture.privacy[k] === false, `privacy ${k} must be false`);
}
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "private receiver allowlist marker leaked into public/source public surfaces" >&2
  exit 1
fi

if grep -RE '"automatic_payment_execution"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment"[[:space:]]*:[[:space:]]*true|"wallet_signing"[[:space:]]*:[[:space:]]*true|"void_transfer"[[:space:]]*:[[:space:]]*true|"public_mutation"[[:space:]]*:[[:space:]]*true|"automatic_payment_execution_enabled"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment_enabled"[[:space:]]*:[[:space:]]*true|"wallet_signing_enabled"[[:space:]]*:[[:space:]]*true|"void_transfer_enabled"[[:space:]]*:[[:space:]]*true|"public_mutation_enabled"[[:space:]]*:[[:space:]]*true|"contains_receiver_address"[[:space:]]*:[[:space:]]*true' "$fixture"; then
  echo "unsafe true authority/private receiver leak found in receiver allowlist hold fixture" >&2
  exit 1
fi

echo "automatic_payment_receiver_allowlist_confirmation_hold_doc_green=true"
echo "automatic_payment_receiver_allowlist_confirmation_hold_fixture_green=true"
echo "automatic_payment_receiver_allowlist_confirmation_hold_private_only_green=true"
echo "automatic_payment_receiver_allowlist_confirmation_hold_dual_chain_receiver_slots_green=true"
echo "automatic_payment_receiver_allowlist_confirmation_hold_receiver_values_withheld_green=true"
echo "automatic_payment_receiver_allowlist_confirmation_hold_usdbc_rejected_green=true"
echo "automatic_payment_receiver_allowlist_confirmation_hold_required_before_activation_green=true"
echo "automatic_payment_receiver_allowlist_confirmation_hold_authority_false_green=true"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_RECEIVER_ALLOWLIST_CONFIRMATION_HOLD_V1_GREEN"
