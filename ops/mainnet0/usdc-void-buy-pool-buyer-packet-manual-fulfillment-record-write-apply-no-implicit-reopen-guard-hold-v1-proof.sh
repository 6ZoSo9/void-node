#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_NO_IMPLICIT_REOPEN_GUARD_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-no-implicit-reopen-guard-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-no-implicit-reopen-guard-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_NO_IMPLICIT_REOPEN_GUARD_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"

grep -q "private/operator-only" "$doc"
grep -q "separate_authority_activation_required_no_apply" "$doc"
grep -q "prevents the sealed manual fulfillment record write apply lane from being treated as reopened by implication" "$doc"
grep -q "Authority remains false" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-no-implicit-reopen-guard-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_NO_IMPLICIT_REOPEN_GUARD_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "separate_authority_activation_required_no_apply", "bad prior state");
assert(Array.isArray(fixture.allowed_no_implicit_reopen_guard_hold_states), "allowed states missing");
assert(fixture.allowed_no_implicit_reopen_guard_hold_states.includes("no_implicit_reopen_guard_active_shape_only"), "active shape-only state missing");
assert(fixture.no_implicit_reopen_guard_hold_state === "no_implicit_reopen_guard_active_shape_only", "bad guard state");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

const guard = fixture.guard_summary;
assert(guard.guard_created === false, "guard must not be created as applied record");
assert(guard.guard_applied === false, "guard must not be applied");
assert(guard.guard_is_shape_only === true, "guard must be shape only");
assert(guard.lane_reopened === false, "lane reopened must be false");
assert(guard.lane_activation_authorized === false, "lane activation authorized must be false");
assert(guard.authority_activated === false, "authority activated must be false");
assert(guard.activation_gate_opened === false, "activation gate opened must be false");
assert(guard.prior_operator_intent_reused === false, "prior operator intent reused must be false");
assert(guard.prior_activation_gate_reused === false, "prior activation gate reused must be false");
assert(guard.prior_authority_record_reused === false, "prior authority record reused must be false");
assert(guard.final_rollup_implies_authority === false, "final rollup implies authority must be false");
assert(guard.lane_closure_implies_authority === false, "lane closure implies authority must be false");
assert(guard.terminal_summary_implies_authority === false, "terminal summary implies authority must be false");
assert(guard.closeout_implies_authority === false, "closeout implies authority must be false");
assert(guard.result_hold_implies_authority === false, "result hold implies authority must be false");
assert(guard.operator_intent_implies_authority === false, "operator intent implies authority must be false");
assert(guard.proof_success_implies_authority === false, "proof success implies authority must be false");
assert(guard.cross_box_tag_implies_authority === false, "cross-box tag implies authority must be false");
assert(guard.precision_final_sync_implies_authority === false, "Precision final sync implies authority must be false");
assert(guard.manual_fulfillment_record_write_performed === false, "record write performed must be false");
assert(guard.manual_fulfillment_record_apply_performed === false, "record apply performed must be false");
assert(guard.append_only_ledger_write_performed === false, "append-only ledger write performed must be false");
assert(guard.allocation_claim_created === false, "allocation claim created must be false");
assert(guard.void_transfer_performed === false, "VOID transfer performed must be false");
assert(guard.public_mutation_performed === false, "public mutation performed must be false");
assert(guard.current_lane_status === "closed_until_new_separate_authority_activation", "bad lane status");
assert(guard.guard_status === "no_implicit_reopen_guard_active_shape_only", "bad guard status");
assert(guard.guard_key === "fixture_shape_only_no_guard_written", "bad guard key");

assert(guard.forbidden_inferences.includes("final_rollup_implies_authority"), "final rollup forbidden inference missing");
assert(guard.forbidden_inferences.includes("activation_gate_hold_implies_open_gate"), "activation gate forbidden inference missing");
assert(guard.forbidden_inferences.includes("proof_success_implies_write_permission"), "proof success forbidden inference missing");
assert(guard.forbidden_inferences.includes("cross_box_tag_implies_write_permission"), "cross-box forbidden inference missing");
assert(guard.forbidden_inferences.includes("precision_final_sync_implies_write_permission"), "Precision final sync forbidden inference missing");
assert(guard.forbidden_inferences.includes("private_fixture_exists_implies_apply_permission"), "private fixture forbidden inference missing");

const req = guard.required_future_activation_checklist;
assert(req.new_authority_activation_request_required === true, "new authority activation request required must be true");
assert(req.new_operator_review_required === true, "new operator review required must be true");
assert(req.new_decision_required === true, "new decision required must be true");
assert(req.new_record_required === true, "new record required must be true");
assert(req.new_activation_gate_required === true, "new activation gate required must be true");
assert(req.new_preflight_required === true, "new preflight required must be true");
assert(req.new_execution_packet_required === true, "new execution packet required must be true");
assert(req.new_duplicate_guard_required === true, "new duplicate guard required must be true");
assert(req.new_cross_box_verification_required === true, "new cross-box verification required must be true");
assert(req.new_precision_final_sync_required === true, "new Precision final sync required must be true");
assert(req.explicit_apply_authority_required === true, "explicit apply authority required must be true");
assert(req.no_apply_before_all_requirements_green === true, "no apply before requirements green must be true");

assert(guard.guard_reason_codes.includes("authority_remains_false"), "authority remains false reason missing");
assert(guard.guard_reason_codes.includes("no_implicit_reopen"), "no implicit reopen reason missing");
assert(guard.guard_reason_codes.includes("no_prior_authority_reuse"), "no prior authority reuse reason missing");
assert(guard.guard_reason_codes.includes("no_record_written"), "no record written reason missing");
assert(guard.guard_reason_codes.includes("no_public_mutation_performed"), "no public mutation reason missing");
assert(guard.blocked_reason_codes.includes("blocked_guard_authority_false"), "blocked guard authority false missing");
assert(guard.final_operator_guard_instruction === "treat_all_prior_write_apply_artifacts_as_closed_evidence_only_not_authority", "bad final guard instruction");

console.log("buyer_packet_manual_fulfillment_record_write_apply_no_implicit_reopen_guard_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_no_implicit_reopen_guard_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-no-implicit-reopen-guard-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_no_implicit_reopen_guard_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_record_write_apply_no_implicit_reopen_guard_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_no_implicit_reopen_guard_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_no_implicit_reopen_guard_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_no_implicit_reopen_guard_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_NO_IMPLICIT_REOPEN_GUARD_HOLD_V1_GREEN"
