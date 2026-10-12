#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_RECORD_CREATION_LIVE_PATH_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-automatic-payment-fulfillment-record-creation-live-path-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-record-creation-live-path-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_RECORD_CREATION_LIVE_PATH_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -F "$marker" "$doc" >/dev/null
grep -F "No public route is allowed" "$doc" >/dev/null
grep -F "fulfillment record creation requires allocation claim pass" "$doc" >/dev/null
grep -F "duplicate fulfillment record key must reject" "$doc" >/dev/null
grep -F "fulfillment record cannot transfer VOID" "$doc" >/dev/null
grep -F "fulfillment execution: false" "$doc" >/dev/null

node <<'NODE'
const fs = require("fs");
const f = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-record-creation-live-path-hold-v1.json", "utf8"));
const req = (x,m)=>{ if(!x) throw new Error(m); };

req(f.marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_RECORD_CREATION_LIVE_PATH_HOLD_V1", "bad marker");
req(f.scope === "private_fulfillment_record_creation_live_path_hold", "bad scope");
req(f.status.packet_state === "hold_only_not_approved", "must be hold only");

for (const k of Object.keys(f.status)) {
  if (k !== "packet_state") req(f.status[k] === false, `status ${k} must be false`);
}
for (const k of Object.keys(f.authority)) {
  req(f.authority[k] === false, `authority ${k} must be false`);
}
for (const k of [
  "buyer_identity_binding_key",
  "payment_verification_key",
  "duplicate_guard_key",
  "reserve_key",
  "allocation_claim_key",
  "derived_void_amount",
  "fulfillment_record_key"
]) req(f.fulfillment_record_key_fields.includes(k), `missing key ${k}`);

for (const s of [
  "duplicate_fulfillment_record_key",
  "fulfillment_record_before_allocation_claim",
  "fulfillment_record_after_failed_payment",
  "fulfillment_record_after_duplicate_payment",
  "fulfillment_record_after_insufficient_inventory",
  "fulfillment_record_with_wallet_authority",
  "fulfillment_record_with_void_transfer_authority",
  "fulfilled_state_without_execution_authorization"
]) req(f.rejected_fulfillment_record_states.includes(s), `missing reject ${s}`);

req(f.privacy.private_packet === true, "must be private");
req(f.privacy.public_route_allowed === false, "public route must be false");
req(f.privacy.contains_wallet_address === false, "wallet address must not be present");
req(f.privacy.contains_receiver_address === false, "receiver address must not be present");
req(f.privacy.contains_private_key === false, "private key must not be present");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "private fulfillment record marker leaked into public/source public surfaces" >&2
  exit 1
fi

if grep -RE '"(automatic_payment_execution|automatic_fulfillment|fulfillment_record_creation|fulfillment_record_append_write|fulfillment_execution|wallet_signing|void_transfer|public_mutation)(_enabled)?"[[:space:]]*:[[:space:]]*true' "$fixture"; then
  echo "unsafe true authority found in fulfillment record fixture" >&2
  exit 1
fi

echo "automatic_payment_fulfillment_record_creation_live_path_hold_doc_green=true"
echo "automatic_payment_fulfillment_record_creation_live_path_hold_fixture_green=true"
echo "automatic_payment_fulfillment_record_creation_live_path_hold_private_only_green=true"
echo "automatic_payment_fulfillment_record_creation_live_path_hold_record_policy_green=true"
echo "automatic_payment_fulfillment_record_creation_live_path_hold_key_fields_green=true"
echo "automatic_payment_fulfillment_record_creation_live_path_hold_reject_states_green=true"
echo "automatic_payment_fulfillment_record_creation_live_path_hold_no_wallet_or_transfer_authority_green=true"
echo "automatic_payment_fulfillment_record_creation_live_path_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_RECORD_CREATION_LIVE_PATH_HOLD_V1_GREEN"
