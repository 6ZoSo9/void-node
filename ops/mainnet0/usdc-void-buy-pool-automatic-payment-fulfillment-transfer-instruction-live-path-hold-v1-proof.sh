#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_TRANSFER_INSTRUCTION_LIVE_PATH_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-automatic-payment-fulfillment-transfer-instruction-live-path-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-transfer-instruction-live-path-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_TRANSFER_INSTRUCTION_LIVE_PATH_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -F "$marker" "$doc" >/dev/null
grep -F "No public route is allowed" "$doc" >/dev/null
grep -F "transfer instruction requires execution authorization pass" "$doc" >/dev/null
grep -F "duplicate transfer instruction key must reject" "$doc" >/dev/null
grep -F "It does not sign" "$doc" >/dev/null
grep -F "It does not broadcast" "$doc" >/dev/null
grep -F "It does not transfer VOID" "$doc" >/dev/null

node <<'NODE'
const fs = require("fs");
const f = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-transfer-instruction-live-path-hold-v1.json", "utf8"));
const req = (x,m)=>{ if(!x) throw new Error(m); };

req(f.marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_TRANSFER_INSTRUCTION_LIVE_PATH_HOLD_V1", "bad marker");
req(f.scope === "private_fulfillment_transfer_instruction_live_path_hold", "bad scope");
req(f.status.packet_state === "hold_only_not_approved", "must be hold only");

for (const k of Object.keys(f.status)) {
  if (k !== "packet_state") req(f.status[k] === false, `status ${k} must be false`);
}
for (const k of Object.keys(f.authority)) {
  req(f.authority[k] === false, `authority ${k} must be false`);
}
for (const k of [
  "fulfillment_execution_authorization_pass",
  "fulfillment_record_creation_pass",
  "allocation_claim_creation_pass",
  "wallet_policy_pass"
]) req(f.required_prerequisite_results.includes(k), `missing prereq ${k}`);

for (const k of [
  "fulfillment_record_key",
  "execution_authorization_key",
  "destination_binding_key",
  "derived_void_amount",
  "transfer_instruction_key"
]) req(f.transfer_instruction_key_fields.includes(k), `missing key ${k}`);

for (const s of [
  "missing_execution_authorization_key",
  "duplicate_transfer_instruction_key",
  "transfer_instruction_before_execution_authorization",
  "transfer_instruction_with_wallet_secret",
  "transfer_instruction_with_wallet_signing_enabled",
  "transfer_instruction_with_void_transfer_enabled",
  "transfer_instruction_with_transaction_broadcast_enabled",
  "transfer_instruction_with_public_mutation_enabled",
  "fulfilled_state_from_instruction_only"
]) req(f.rejected_transfer_instruction_states.includes(s), `missing reject ${s}`);

req(f.privacy.private_packet === true, "must be private");
req(f.privacy.public_route_allowed === false, "public route must be false");
req(f.privacy.contains_wallet_address === false, "wallet address must not be present");
req(f.privacy.contains_destination_address === false, "destination address must not be present");
req(f.privacy.contains_wallet_secret === false, "wallet secret must not be present");
req(f.privacy.contains_private_key === false, "private key must not be present");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "private transfer instruction marker leaked into public/source public surfaces" >&2
  exit 1
fi

if grep -RE '"(transfer_instruction_creation|wallet_signing|void_transfer|transaction_broadcast|fulfillment_execution|automatic_fulfillment|public_mutation)(_enabled)?"[[:space:]]*:[[:space:]]*true' "$fixture"; then
  echo "unsafe true authority found in transfer instruction fixture" >&2
  exit 1
fi

echo "automatic_payment_fulfillment_transfer_instruction_live_path_hold_doc_green=true"
echo "automatic_payment_fulfillment_transfer_instruction_live_path_hold_fixture_green=true"
echo "automatic_payment_fulfillment_transfer_instruction_live_path_hold_private_only_green=true"
echo "automatic_payment_fulfillment_transfer_instruction_live_path_hold_policy_green=true"
echo "automatic_payment_fulfillment_transfer_instruction_live_path_hold_key_fields_green=true"
echo "automatic_payment_fulfillment_transfer_instruction_live_path_hold_reject_states_green=true"
echo "automatic_payment_fulfillment_transfer_instruction_live_path_hold_no_sign_or_transfer_authority_green=true"
echo "automatic_payment_fulfillment_transfer_instruction_live_path_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_TRANSFER_INSTRUCTION_LIVE_PATH_HOLD_V1_GREEN"
