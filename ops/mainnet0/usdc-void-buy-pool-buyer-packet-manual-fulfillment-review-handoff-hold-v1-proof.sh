#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_REVIEW_HANDOFF_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-review-handoff-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-review-handoff-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_REVIEW_HANDOFF_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"

grep -q "private/operator-only" "$doc"
grep -q "payment_eligibility_decision_result_recorded_unverified" "$doc"
grep -q "ready_for_separate_manual_fulfillment_review_packet" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-review-handoff-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_REVIEW_HANDOFF_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "payment_eligibility_decision_result_recorded_unverified", "bad prior state");
assert(Array.isArray(fixture.allowed_handoff_states), "allowed states missing");
assert(fixture.allowed_handoff_states.includes("ready_for_separate_manual_fulfillment_review_packet"), "ready state missing");
assert(fixture.handoff_state === "held_manual_fulfillment_review_handoff_shape_only", "bad fixture hold state");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

assert(fixture.authority.public_route_mounted === false, "public route mounted");
assert(fixture.authority.public_node_mutation_authority === false, "public mutation authority true");
assert(fixture.authority.manual_fulfillment_approval_authority === false, "manual fulfillment approval authority true");
assert(fixture.authority.void_transfer_authority === false, "void transfer authority true");
assert(fixture.authority.wallet_signing_authority === false, "wallet signing authority true");
assert(fixture.authority.automatic_fulfillment_authority === false, "automatic fulfillment authority true");

assert(fixture.handoff_result.handoff_ready === false, "fixture handoff ready should be false");
assert(fixture.handoff_result.handoff_reason_codes.includes("fixture_shape_only"), "fixture shape reason missing");

console.log("buyer_packet_manual_fulfillment_review_handoff_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_review_handoff_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-review-handoff-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_review_handoff_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_review_handoff_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_review_handoff_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_review_handoff_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_review_handoff_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_REVIEW_HANDOFF_HOLD_V1_GREEN"
