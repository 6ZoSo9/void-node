#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_WALLET_POLICY_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-automatic-payment-fulfillment-wallet-policy-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-wallet-policy-hold-v1.json"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_WALLET_POLICY_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -F "$marker" "$doc" >/dev/null
grep -F "No public route is allowed" "$doc" >/dev/null
grep -F "wallet address: withheld" "$doc" >/dev/null
grep -F "signer access: false" "$doc" >/dev/null
grep -F "wallet signing: false" "$doc" >/dev/null
grep -F "VOID transfer: false" "$doc" >/dev/null
grep -F "automatic fulfillment: false" "$doc" >/dev/null
grep -F "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" "$doc" >/dev/null
grep -F "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" "$doc" >/dev/null

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-wallet-policy-hold-v1.json", "utf8"));

function assert(x, msg){ if(!x){ throw new Error(msg); } }

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_WALLET_POLICY_HOLD_V1", "bad marker");
assert(fixture.scope === "private_fulfillment_wallet_policy_hold", "bad scope");
assert(fixture.status.packet_state === "hold_only_not_approved", "packet must be hold only");
assert(fixture.status.wallet_policy_approved === false, "wallet policy must not be approved");
assert(fixture.status.void_fulfillment_wallet_present === false, "wallet must not be present");
assert(fixture.status.signer_access_enabled === false, "signer access must be disabled");
assert(fixture.status.wallet_signing_enabled === false, "wallet signing must be disabled");
assert(fixture.status.void_transfer_enabled === false, "void transfer must be disabled");

const slots = fixture.wallet_policy_slots;
assert(slots.void_fulfillment_wallet.wallet_address === "withheld_required_before_activation", "wallet address must be withheld");
assert(slots.void_fulfillment_wallet.wallet_address_publicly_disclosed === false, "wallet address must not be public");
assert(slots.void_fulfillment_wallet.signer_access === false, "slot signer access must be false");
assert(slots.void_fulfillment_wallet.transfer_authority === false, "slot transfer authority must be false");
assert(slots.void_fulfillment_wallet.approval_state === "not_approved", "slot must not be approved");

assert(slots.ethereum_usdc_receipt_monitor.chain_id === 1, "bad eth chain");
assert(slots.ethereum_usdc_receipt_monitor.token_contract_lowercase === "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", "bad eth token");
assert(slots.ethereum_usdc_receipt_monitor.receiver_value === "withheld_by_receiver_allowlist_packet", "eth receiver must be withheld");
assert(slots.ethereum_usdc_receipt_monitor.signing_required === false, "eth receipt monitor must not require signing");

assert(slots.base_usdc_receipt_monitor.chain_id === 8453, "bad base chain");
assert(slots.base_usdc_receipt_monitor.token_contract_lowercase === "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", "bad base token");
assert(slots.base_usdc_receipt_monitor.receiver_value === "withheld_by_receiver_allowlist_packet", "base receiver must be withheld");
assert(slots.base_usdc_receipt_monitor.signing_required === false, "base receipt monitor must not require signing");

for (const required of [
  "explicit_operator_wallet_policy_approval_record",
  "signer_access_remains_off_until_activation_command",
  "private_key_seed_phrase_no_leak_proof",
  "wallet_address_disclosure_policy_decision",
  "void_transfer_dry_run_fixture_only",
  "allocation_claim_write_guard_proof",
  "inventory_reserve_decrement_proof",
  "rollback_disable_switch_proof",
  "cross_box_wallet_policy_dry_run",
  "final_precision_sync"
]) {
  assert(fixture.required_before_activation.includes(required), `missing ${required}`);
}

for (const [k, v] of Object.entries(fixture.authority)) {
  assert(v === false, `authority ${k} must be false`);
}
for (const k of [
  "contains_wallet_address",
  "contains_wallet_secret",
  "contains_private_key",
  "contains_seed_phrase",
  "contains_buyer_private_data"
]) {
  assert(fixture.privacy[k] === false, `privacy ${k} must be false`);
}
assert(fixture.privacy.private_packet === true, "must be private");
assert(fixture.privacy.public_route_allowed === false, "public route must be disallowed");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "private fulfillment wallet policy marker leaked into public/source public surfaces" >&2
  exit 1
fi

if grep -RE '"automatic_payment_execution"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment"[[:space:]]*:[[:space:]]*true|"signer_access"[[:space:]]*:[[:space:]]*true|"wallet_signing"[[:space:]]*:[[:space:]]*true|"void_transfer"[[:space:]]*:[[:space:]]*true|"public_mutation"[[:space:]]*:[[:space:]]*true|"automatic_payment_execution_enabled"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment_enabled"[[:space:]]*:[[:space:]]*true|"signer_access_enabled"[[:space:]]*:[[:space:]]*true|"wallet_signing_enabled"[[:space:]]*:[[:space:]]*true|"void_transfer_enabled"[[:space:]]*:[[:space:]]*true|"public_mutation_enabled"[[:space:]]*:[[:space:]]*true|"contains_wallet_address"[[:space:]]*:[[:space:]]*true|"contains_wallet_secret"[[:space:]]*:[[:space:]]*true|"contains_private_key"[[:space:]]*:[[:space:]]*true|"contains_seed_phrase"[[:space:]]*:[[:space:]]*true' "$fixture"; then
  echo "unsafe true authority/wallet leak found in wallet policy hold fixture" >&2
  exit 1
fi

echo "automatic_payment_fulfillment_wallet_policy_hold_doc_green=true"
echo "automatic_payment_fulfillment_wallet_policy_hold_fixture_green=true"
echo "automatic_payment_fulfillment_wallet_policy_hold_private_only_green=true"
echo "automatic_payment_fulfillment_wallet_policy_hold_wallet_withheld_green=true"
echo "automatic_payment_fulfillment_wallet_policy_hold_signer_access_false_green=true"
echo "automatic_payment_fulfillment_wallet_policy_hold_dual_chain_receipt_monitor_green=true"
echo "automatic_payment_fulfillment_wallet_policy_hold_required_before_activation_green=true"
echo "automatic_payment_fulfillment_wallet_policy_hold_authority_false_green=true"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_WALLET_POLICY_HOLD_V1_GREEN"
