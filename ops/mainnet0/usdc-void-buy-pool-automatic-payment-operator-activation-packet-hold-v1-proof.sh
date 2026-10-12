#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_ACTIVATION_PACKET_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-automatic-payment-operator-activation-packet-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-operator-activation-packet-hold-v1.json"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_ACTIVATION_PACKET_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -F "$marker" "$doc" >/dev/null
grep -F "No public route is allowed" "$doc" >/dev/null
grep -F "automatic payment execution: false" "$doc" >/dev/null
grep -F "automatic fulfillment: false" "$doc" >/dev/null
grep -F "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" "$doc" >/dev/null
grep -F "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" "$doc" >/dev/null
grep -F "bridged USDbC" "$doc" >/dev/null

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-automatic-payment-operator-activation-packet-hold-v1.json", "utf8"));

function assert(x, msg){ if(!x){ throw new Error(msg); } }

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_ACTIVATION_PACKET_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_activation_packet_hold", "bad scope");
assert(fixture.status.packet_state === "hold_only_not_approved", "packet must be hold only");
assert(fixture.status.operator_approval_record_present === false, "operator approval must be absent");
assert(fixture.privacy.private_packet === true, "must be private packet");
assert(fixture.privacy.public_route_allowed === false, "public route must be disallowed");

assert(Array.isArray(fixture.accepted_assets) && fixture.accepted_assets.length === 2, "must accept exactly two assets");
const chains = new Set(fixture.accepted_assets.map(a => `${a.chain_id}:${a.token_contract_lowercase}:${a.decimals}:${a.native_usdc}`));
assert(chains.has("1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48:6:true"), "missing ethereum usdc");
assert(chains.has("8453:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913:6:true"), "missing base native usdc");
assert(fixture.rejected_assets.includes("bridged_usdbc"), "must reject bridged USDbC");

for (const required of [
  "explicit_operator_approval_record",
  "private_receiver_allowlist_confirmation",
  "private_fulfillment_wallet_policy",
  "duplicate_payment_guard_live_path_proof",
  "verified_receipt_parser_live_path_proof",
  "chain_token_receiver_allowlist_live_path_proof",
  "inventory_reserve_decrement_proof",
  "sold_out_closeout_proof",
  "rollback_disable_switch_proof",
  "cross_box_live_dry_run",
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
  "contains_wallet_secret",
  "contains_private_key",
  "contains_seed_phrase",
  "contains_buyer_private_data"
]) {
  assert(fixture.privacy[k] === false, `privacy ${k} must be false`);
}
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "private activation packet marker leaked into public/source public surfaces" >&2
  exit 1
fi

if grep -RE '"automatic_payment_execution"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment"[[:space:]]*:[[:space:]]*true|"wallet_signing"[[:space:]]*:[[:space:]]*true|"void_transfer"[[:space:]]*:[[:space:]]*true|"public_mutation"[[:space:]]*:[[:space:]]*true|"automatic_payment_execution_enabled"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment_enabled"[[:space:]]*:[[:space:]]*true|"wallet_signing_enabled"[[:space:]]*:[[:space:]]*true|"void_transfer_enabled"[[:space:]]*:[[:space:]]*true|"public_mutation_enabled"[[:space:]]*:[[:space:]]*true' "$fixture"; then
  echo "unsafe true authority found in activation packet hold fixture" >&2
  exit 1
fi

echo "automatic_payment_operator_activation_packet_hold_doc_green=true"
echo "automatic_payment_operator_activation_packet_hold_fixture_green=true"
echo "automatic_payment_operator_activation_packet_hold_private_only_green=true"
echo "automatic_payment_operator_activation_packet_hold_dual_chain_usdc_green=true"
echo "automatic_payment_operator_activation_packet_hold_usdbc_rejected_green=true"
echo "automatic_payment_operator_activation_packet_hold_required_before_activation_green=true"
echo "automatic_payment_operator_activation_packet_hold_authority_false_green=true"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_ACTIVATION_PACKET_HOLD_V1_GREEN"
