#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_EXECUTION_AUTHORIZATION_LIVE_PATH_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-automatic-payment-fulfillment-execution-authorization-live-path-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-execution-authorization-live-path-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_EXECUTION_AUTHORIZATION_LIVE_PATH_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -F "$marker" "$doc" >/dev/null
grep -F "No public route is allowed" "$doc" >/dev/null
grep -F "execution authorization requires fulfillment record creation pass" "$doc" >/dev/null
grep -F "explicit operator authorization packet" "$doc" >/dev/null
grep -F "duplicate execution key must reject" "$doc" >/dev/null
grep -F "wallet signing: false" "$doc" >/dev/null
grep -F "VOID transfer: false" "$doc" >/dev/null

node <<'NODE'
const fs = require("fs");
const f = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-execution-authorization-live-path-hold-v1.json", "utf8"));
const req = (x,m)=>{ if(!x) throw new Error(m); };

req(f.marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_EXECUTION_AUTHORIZATION_LIVE_PATH_HOLD_V1", "bad marker");
req(f.scope === "private_fulfillment_execution_authorization_live_path_hold", "bad scope");
req(f.status.packet_state === "hold_only_not_approved", "must be hold only");

for (const k of Object.keys(f.status)) {
  if (k !== "packet_state") req(f.status[k] === false, `status ${k} must be false`);
}
for (const k of Object.keys(f.authority)) {
  req(f.authority[k] === false, `authority ${k} must be false`);
}
for (const k of [
  "fulfillment_record_creation_pass",
  "operator_activation_packet_pass",
  "wallet_policy_pass",
  "receiver_allowlist_pass"
]) req(f.required_prerequisite_results.includes(k), `missing prereq ${k}`);

for (const k of [
  "fulfillment_record_key",
  "operator_authorization_key",
  "execution_authorization_key",
  "derived_void_amount"
]) req(f.execution_authorization_key_fields.includes(k), `missing key ${k}`);

for (const s of [
  "missing_fulfillment_record_key",
  "missing_operator_authorization_key",
  "duplicate_execution_authorization_key",
  "execution_authorization_before_fulfillment_record",
  "execution_authorization_with_wallet_secret",
  "execution_authorization_with_wallet_signing_enabled",
  "execution_authorization_with_void_transfer_enabled",
  "execution_authorization_with_public_mutation_enabled",
  "fulfilled_state_without_separate_signer_transfer_authorization"
]) req(f.rejected_execution_authorization_states.includes(s), `missing reject ${s}`);

req(f.privacy.private_packet === true, "must be private");
req(f.privacy.public_route_allowed === false, "public route must be false");
req(f.privacy.contains_wallet_address === false, "wallet address must not be present");
req(f.privacy.contains_receiver_address === false, "receiver address must not be present");
req(f.privacy.contains_wallet_secret === false, "wallet secret must not be present");
req(f.privacy.contains_private_key === false, "private key must not be present");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "private execution authorization marker leaked into public/source public surfaces" >&2
  exit 1
fi

if grep -RE '"(automatic_payment_execution|automatic_fulfillment|fulfillment_execution_authorization|fulfillment_execution|wallet_signing|void_transfer|public_mutation)(_enabled)?"[[:space:]]*:[[:space:]]*true' "$fixture"; then
  echo "unsafe true authority found in execution authorization fixture" >&2
  exit 1
fi

echo "automatic_payment_fulfillment_execution_authorization_live_path_hold_doc_green=true"
echo "automatic_payment_fulfillment_execution_authorization_live_path_hold_fixture_green=true"
echo "automatic_payment_fulfillment_execution_authorization_live_path_hold_private_only_green=true"
echo "automatic_payment_fulfillment_execution_authorization_live_path_hold_policy_green=true"
echo "automatic_payment_fulfillment_execution_authorization_live_path_hold_key_fields_green=true"
echo "automatic_payment_fulfillment_execution_authorization_live_path_hold_reject_states_green=true"
echo "automatic_payment_fulfillment_execution_authorization_live_path_hold_no_wallet_or_transfer_authority_green=true"
echo "automatic_payment_fulfillment_execution_authorization_live_path_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_EXECUTION_AUTHORIZATION_LIVE_PATH_HOLD_V1_GREEN"
