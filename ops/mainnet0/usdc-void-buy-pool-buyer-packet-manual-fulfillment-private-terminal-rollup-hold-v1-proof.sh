#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PRIVATE_TERMINAL_ROLLUP_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-private-terminal-rollup-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-private-terminal-rollup-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PRIVATE_TERMINAL_ROLLUP_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"
grep -q "private/operator-only" "$doc"
grep -q "closed_lane_authority_denial_sealed_shape_only" "$doc"
grep -q "closed evidence only" "$doc"
grep -q "Authority remains false" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-private-terminal-rollup-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PRIVATE_TERMINAL_ROLLUP_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "closed_lane_authority_denial_sealed_shape_only", "bad prior required state");
assert(fixture.terminal_rollup_hold_state === "private_terminal_rollup_sealed_shape_only", "bad terminal rollup state");
assert(fixture.allowed_terminal_rollup_hold_states.includes("private_terminal_rollup_sealed_shape_only"), "sealed state missing");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

const s = fixture.chain_summary;
assert(s.rollup_created === false, "rollup must not be created as applied record");
assert(s.rollup_applied === false, "rollup must not be applied");
assert(s.rollup_is_shape_only === true, "rollup must be shape only");
assert(s.current_chain_status === "closed_private_evidence_only", "bad chain status");
assert(s.chain_artifacts_are_evidence_only === true, "artifacts must be evidence only");
assert(s.future_authority_requires_new_separate_activation_path === true, "future authority requirement missing");
assert(s.manual_fulfillment_authorized === false, "manual fulfillment authorized must be false");
assert(s.manual_fulfillment_record_write_authorized === false, "record write authorized must be false");
assert(s.manual_fulfillment_record_apply_authorized === false, "record apply authorized must be false");
assert(s.append_only_ledger_write_authorized === false, "ledger write authorized must be false");
assert(s.allocation_claim_creation_authorized === false, "allocation claim authorized must be false");
assert(s.void_transfer_authorized === false, "VOID transfer authorized must be false");
assert(s.wallet_signing_authorized === false, "wallet signing authorized must be false");
assert(s.treasury_movement_authorized === false, "treasury movement authorized must be false");
assert(s.public_node_mutation_authorized === false, "public mutation authorized must be false");
assert(s.automatic_fulfillment_authorized === false, "automatic fulfillment authorized must be false");
assert(s.buyer_fulfilled === false, "buyer fulfilled must be false");
assert(s.manual_fulfillment_record_written === false, "record written must be false");
assert(s.manual_fulfillment_record_applied === false, "record applied must be false");
assert(s.public_mutation_performed === false, "public mutation performed must be false");
assert(s.terminal_operator_instruction === "treat_buyer_packet_manual_fulfillment_chain_as_closed_private_evidence_only_until_new_separate_authority_activation_path_is_fully_sealed", "bad terminal instruction");

assert(fixture.rolled_up_private_holds.includes("manual_fulfillment_record_write_apply_closed_lane_authority_denial_seal_hold"), "closed lane denial seal missing");
assert(fixture.rolled_up_private_holds.includes("manual_fulfillment_record_write_apply_no_implicit_reopen_guard_hold"), "no implicit reopen missing");
assert(fixture.rolled_up_private_holds.includes("manual_fulfillment_record_write_apply_separate_authority_activation_boundary_hold"), "separate boundary missing");
assert(fixture.rolled_up_private_holds.includes("manual_fulfillment_review_handoff_hold"), "handoff missing");
assert(fixture.rolled_up_private_holds.length >= 25, "rolled up holds too small");

assert(fixture.forbidden_inferences.includes("terminal_rollup_implies_apply_authority"), "terminal rollup apply inference missing");
assert(fixture.forbidden_inferences.includes("precision_final_sync_implies_apply_authority"), "final sync apply inference missing");
assert(fixture.forbidden_inferences.includes("private_fixture_exists_implies_apply_authority"), "private fixture inference missing");

const req = fixture.future_activation_requirements;
assert(req.new_separate_authority_activation_path_required === true, "new separate activation path required");
assert(req.new_cross_box_verification_required === true, "cross-box required");
assert(req.new_precision_final_sync_required === true, "Precision final sync required");
assert(req.explicit_write_authority_required === true, "explicit write authority required");
assert(req.explicit_apply_authority_required === true, "explicit apply authority required");
assert(req.explicit_transfer_authority_required === true, "explicit transfer authority required");
assert(req.no_write_apply_transfer_or_public_mutation_before_all_requirements_green === true, "no write/apply/transfer/public mutation before all green required");

console.log("buyer_packet_manual_fulfillment_private_terminal_rollup_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_private_terminal_rollup_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-private-terminal-rollup-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_private_terminal_rollup_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_private_terminal_rollup_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_private_terminal_rollup_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_private_terminal_rollup_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_private_terminal_rollup_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PRIVATE_TERMINAL_ROLLUP_HOLD_V1_GREEN"
