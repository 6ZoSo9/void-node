#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_SEPARATE_AUTHORITY_ACTIVATION_BOUNDARY_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-separate-authority-activation-boundary-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-separate-authority-activation-boundary-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_SEPARATE_AUTHORITY_ACTIVATION_BOUNDARY_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"

grep -q "private/operator-only" "$doc"
grep -q "final_rollup_sealed_lane_closed_until_separate_authority_activation" "$doc"
grep -q "cannot be reopened or activated by implication" "$doc"
grep -q "Authority remains false" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-separate-authority-activation-boundary-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_SEPARATE_AUTHORITY_ACTIVATION_BOUNDARY_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "final_rollup_sealed_lane_closed_until_separate_authority_activation", "bad prior state");
assert(Array.isArray(fixture.allowed_separate_authority_activation_boundary_hold_states), "allowed states missing");
assert(fixture.allowed_separate_authority_activation_boundary_hold_states.includes("separate_authority_activation_required_no_apply"), "required no-apply state missing");
assert(fixture.separate_authority_activation_boundary_hold_state === "separate_authority_activation_required_no_apply", "bad boundary hold state");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

const boundary = fixture.boundary_summary;
assert(boundary.boundary_created === false, "boundary must not be created as real applied record");
assert(boundary.boundary_applied === false, "boundary must not be applied");
assert(boundary.lane_reopened === false, "lane reopened must be false");
assert(boundary.lane_activation_authorized === false, "lane activation authorized must be false");
assert(boundary.authority_activated === false, "authority activated must be false");
assert(boundary.activation_gate_opened === false, "activation gate opened must be false");
assert(boundary.prior_activation_gate_reused === false, "prior activation gate reused must be false");
assert(boundary.prior_authority_record_reused === false, "prior authority record reused must be false");
assert(boundary.implicit_activation_allowed === false, "implicit activation allowed must be false");
assert(boundary.silent_reopen_allowed === false, "silent reopen allowed must be false");
assert(boundary.manual_fulfillment_record_write_performed === false, "record write performed must be false");
assert(boundary.manual_fulfillment_record_apply_performed === false, "record apply performed must be false");
assert(boundary.append_only_ledger_write_performed === false, "append-only ledger write performed must be false");
assert(boundary.allocation_claim_created === false, "allocation claim created must be false");
assert(boundary.void_transfer_performed === false, "VOID transfer performed must be false");
assert(boundary.public_mutation_performed === false, "public mutation performed must be false");
assert(boundary.current_lane_status === "closed_until_separate_authority_activation", "bad current lane status");
assert(boundary.boundary_status === "separate_authority_activation_required_no_apply", "bad boundary status");
assert(boundary.boundary_key === "fixture_shape_only_no_boundary_written", "bad boundary key");

const req = boundary.separate_authority_activation_requirements;
assert(req.new_authority_activation_request_required === true, "new authority activation request required must be true");
assert(req.new_operator_review_required === true, "new operator review required must be true");
assert(req.new_decision_required === true, "new decision required must be true");
assert(req.new_record_required === true, "new record required must be true");
assert(req.new_activation_gate_required === true, "new activation gate required must be true");
assert(req.new_preflight_required === true, "new preflight required must be true");
assert(req.new_execution_packet_required === true, "new execution packet required must be true");
assert(req.new_cross_box_verification_required === true, "new cross-box verification required must be true");
assert(req.new_precision_final_sync_required === true, "new Precision final sync required must be true");
assert(req.no_apply_before_all_requirements_green === true, "no apply before requirements green must be true");

assert(boundary.forbidden_shortcuts.includes("reuse_prior_activation_gate_as_open"), "prior gate shortcut missing");
assert(boundary.forbidden_shortcuts.includes("infer_authority_from_final_rollup"), "final rollup inference shortcut missing");
assert(boundary.forbidden_shortcuts.includes("perform_manual_record_write_without_new_authority_activation"), "record write shortcut missing");
assert(boundary.forbidden_shortcuts.includes("perform_void_transfer_without_new_authority_activation"), "VOID transfer shortcut missing");
assert(boundary.boundary_reason_codes.includes("authority_remains_false"), "authority remains false reason missing");
assert(boundary.boundary_reason_codes.includes("separate_authority_activation_required"), "separate authority reason missing");
assert(boundary.boundary_reason_codes.includes("no_implicit_activation"), "no implicit activation reason missing");
assert(boundary.boundary_reason_codes.includes("no_silent_reopen"), "no silent reopen reason missing");
assert(boundary.boundary_reason_codes.includes("no_record_written"), "no record written reason missing");
assert(boundary.boundary_reason_codes.includes("no_public_mutation_performed"), "no public mutation reason missing");
assert(boundary.blocked_reason_codes.includes("blocked_current_authority_false"), "blocked current authority false missing");
assert(boundary.final_operator_instruction === "do_not_reopen_or_apply_manual_fulfillment_record_write_apply_lane_without_new_separate_authority_activation_path", "bad final operator instruction");

console.log("buyer_packet_manual_fulfillment_record_write_apply_separate_authority_activation_boundary_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_separate_authority_activation_boundary_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-separate-authority-activation-boundary-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_separate_authority_activation_boundary_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_record_write_apply_separate_authority_activation_boundary_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_separate_authority_activation_boundary_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_separate_authority_activation_boundary_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_separate_authority_activation_boundary_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_SEPARATE_AUTHORITY_ACTIVATION_BOUNDARY_HOLD_V1_GREEN"
