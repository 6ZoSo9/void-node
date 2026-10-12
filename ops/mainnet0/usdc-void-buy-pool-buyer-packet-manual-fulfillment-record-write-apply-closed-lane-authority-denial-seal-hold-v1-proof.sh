#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_CLOSED_LANE_AUTHORITY_DENIAL_SEAL_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-closed-lane-authority-denial-seal-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-closed-lane-authority-denial-seal-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_CLOSED_LANE_AUTHORITY_DENIAL_SEAL_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"

grep -q "private/operator-only" "$doc"
grep -q "no_implicit_reopen_guard_active_shape_only" "$doc"
grep -q "closed evidence only" "$doc"
grep -q "Authority remains false" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-closed-lane-authority-denial-seal-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_CLOSED_LANE_AUTHORITY_DENIAL_SEAL_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "no_implicit_reopen_guard_active_shape_only", "bad prior state");
assert(Array.isArray(fixture.allowed_closed_lane_authority_denial_seal_hold_states), "allowed states missing");
assert(fixture.allowed_closed_lane_authority_denial_seal_hold_states.includes("closed_lane_authority_denial_sealed_shape_only"), "sealed shape-only state missing");
assert(fixture.closed_lane_authority_denial_seal_hold_state === "closed_lane_authority_denial_sealed_shape_only", "bad seal state");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

const seal = fixture.seal_summary;
assert(seal.seal_created === false, "seal must not be created as applied record");
assert(seal.seal_applied === false, "seal must not be applied");
assert(seal.seal_is_shape_only === true, "seal must be shape only");
assert(seal.lane_reopened === false, "lane reopened must be false");
assert(seal.lane_activation_authorized === false, "lane activation authorized must be false");
assert(seal.authority_activated === false, "authority activated must be false");
assert(seal.activation_gate_opened === false, "activation gate opened must be false");
assert(seal.manual_fulfillment_record_write_performed === false, "record write performed must be false");
assert(seal.manual_fulfillment_record_apply_performed === false, "record apply performed must be false");
assert(seal.append_only_ledger_write_performed === false, "append-only ledger write performed must be false");
assert(seal.allocation_claim_created === false, "allocation claim created must be false");
assert(seal.void_transfer_performed === false, "VOID transfer performed must be false");
assert(seal.wallet_signing_performed === false, "wallet signing performed must be false");
assert(seal.treasury_movement_performed === false, "treasury movement performed must be false");
assert(seal.automatic_fulfillment_performed === false, "automatic fulfillment performed must be false");
assert(seal.public_mutation_performed === false, "public mutation performed must be false");
assert(seal.current_lane_status === "closed_evidence_only_until_new_separate_authority_activation", "bad lane status");
assert(seal.final_authority_denial_status === "all_write_apply_transfer_public_mutation_authority_denied", "bad denial status");
assert(seal.seal_status === "closed_lane_authority_denial_sealed_shape_only", "bad seal status");
assert(seal.seal_key === "fixture_shape_only_no_seal_written", "bad seal key");

assert(seal.closed_evidence_only_sources.includes("no_implicit_reopen_guard_hold"), "no implicit reopen source missing");
assert(seal.closed_evidence_only_sources.includes("separate_authority_activation_boundary_hold"), "separate boundary source missing");
assert(seal.closed_evidence_only_sources.includes("lane_final_rollup_hold"), "lane final rollup source missing");
assert(seal.closed_evidence_only_sources.includes("lane_closure_hold"), "lane closure source missing");
assert(seal.closed_evidence_only_sources.includes("activation_gate_hold"), "activation gate source missing");
assert(seal.closed_evidence_only_sources.includes("write_apply_packet_hold"), "write apply packet source missing");

assert(seal.final_forbidden_inferences.includes("proof_success_implies_write_authority"), "proof write authority forbidden inference missing");
assert(seal.final_forbidden_inferences.includes("precision_final_sync_implies_apply_authority"), "Precision final sync apply authority forbidden inference missing");
assert(seal.final_forbidden_inferences.includes("activation_gate_hold_implies_open_gate"), "activation gate inference missing");
assert(seal.final_forbidden_inferences.includes("authority_record_hold_implies_active_authority"), "authority record inference missing");
assert(seal.final_forbidden_inferences.includes("private_fixture_exists_implies_apply_permission"), "private fixture inference missing");
assert(seal.final_forbidden_inferences.includes("terminal_seal_exists_implies_apply_permission"), "terminal seal inference missing");

const req = seal.final_future_activation_requirements;
assert(req.new_separate_authority_activation_path_required === true, "new separate authority path required must be true");
assert(req.new_operator_review_required === true, "new operator review required must be true");
assert(req.new_decision_required === true, "new decision required must be true");
assert(req.new_record_required === true, "new record required must be true");
assert(req.new_activation_gate_required === true, "new activation gate required must be true");
assert(req.new_preflight_required === true, "new preflight required must be true");
assert(req.new_execution_packet_required === true, "new execution packet required must be true");
assert(req.new_duplicate_guard_required === true, "new duplicate guard required must be true");
assert(req.new_cross_box_verification_required === true, "new cross-box verification required must be true");
assert(req.new_precision_final_sync_required === true, "new Precision final sync required must be true");
assert(req.explicit_write_authority_required === true, "explicit write authority required must be true");
assert(req.explicit_apply_authority_required === true, "explicit apply authority required must be true");
assert(req.explicit_transfer_authority_required === true, "explicit transfer authority required must be true");
assert(req.explicit_public_mutation_authority_required_for_public_mutation === true, "explicit public mutation authority required must be true");
assert(req.no_write_apply_transfer_or_public_mutation_before_all_requirements_green === true, "no write/apply/transfer/public mutation before requirements green must be true");

assert(seal.authority_denial_reason_codes.includes("authority_remains_false"), "authority remains false reason missing");
assert(seal.authority_denial_reason_codes.includes("all_prior_artifacts_are_closed_evidence_only"), "closed evidence only reason missing");
assert(seal.authority_denial_reason_codes.includes("no_implicit_reopen"), "no implicit reopen reason missing");
assert(seal.authority_denial_reason_codes.includes("no_prior_authority_reuse"), "no prior authority reuse reason missing");
assert(seal.authority_denial_reason_codes.includes("no_record_written"), "no record written reason missing");
assert(seal.authority_denial_reason_codes.includes("no_apply_performed"), "no apply reason missing");
assert(seal.authority_denial_reason_codes.includes("no_public_mutation_performed"), "no public mutation reason missing");
assert(seal.blocked_reason_codes.includes("blocked_authority_denial_seal_authority_false"), "blocked seal authority false missing");
assert(seal.final_operator_seal_instruction === "treat_manual_fulfillment_record_write_apply_lane_as_closed_evidence_only_until_new_separate_authority_activation_path_is_fully_sealed", "bad final seal instruction");

console.log("buyer_packet_manual_fulfillment_record_write_apply_closed_lane_authority_denial_seal_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_closed_lane_authority_denial_seal_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-closed-lane-authority-denial-seal-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_closed_lane_authority_denial_seal_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_record_write_apply_closed_lane_authority_denial_seal_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_closed_lane_authority_denial_seal_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_closed_lane_authority_denial_seal_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_closed_lane_authority_denial_seal_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_CLOSED_LANE_AUTHORITY_DENIAL_SEAL_HOLD_V1_GREEN"
