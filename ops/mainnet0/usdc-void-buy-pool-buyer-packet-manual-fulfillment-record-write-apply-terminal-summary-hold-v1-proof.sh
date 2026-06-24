#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_TERMINAL_SUMMARY_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-terminal-summary-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-terminal-summary-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_TERMINAL_SUMMARY_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"

grep -q "private/operator-only" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_terminal_summary_hold" "$doc"
grep -q "terminal_summary_closed_no_apply_shape_only" "$doc"
grep -q "Authority remains false" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-terminal-summary-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_TERMINAL_SUMMARY_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "ready_for_separate_manual_fulfillment_record_write_apply_terminal_summary_hold", "bad prior state");
assert(Array.isArray(fixture.allowed_terminal_summary_hold_states), "allowed states missing");
assert(fixture.allowed_terminal_summary_hold_states.includes("terminal_summary_closed_no_apply_shape_only"), "terminal no-apply close state missing");
assert(fixture.terminal_summary_hold_state === "held_terminal_summary_shape_only", "bad fixture hold state");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

const summary = fixture.proposed_terminal_summary;
assert(summary.terminal_summary_created === false, "fixture must not create terminal summary");
assert(summary.terminal_summary_completed === false, "fixture terminal summary must not complete");
assert(summary.terminal_summary_authorized === false, "fixture terminal summary must not authorize");
assert(summary.terminal_summary_applied === false, "fixture terminal summary must not apply");
assert(summary.closeout_hold_ready === false, "fixture closeout hold ready must be false");
assert(summary.closeout_applied === false, "fixture closeout applied must be false");
assert(summary.result_hold_ready === false, "fixture result hold ready must be false");
assert(summary.result_applied === false, "fixture result applied must be false");
assert(summary.execution_apply_ready === false, "fixture execution apply ready must be false");
assert(summary.execution_apply_performed === false, "fixture execution apply performed must be false");
assert(summary.final_apply_preflight_passed === false, "fixture final preflight passed must be false");
assert(summary.operator_apply_intent_authorized === false, "fixture operator intent authorized must be false");
assert(summary.activation_gate_opened === false, "fixture activation gate opened must be false");
assert(summary.authority_activation_record_ready === false, "fixture authority record ready must be false");
assert(summary.authority_activated === false, "fixture authority activated must be false");
assert(summary.write_apply_execution_ready === false, "fixture write apply execution ready must be false");
assert(summary.write_apply_packet_verified === false, "fixture write apply packet verified must be false");
assert(summary.duplicate_record_key_guard_passed === false, "fixture duplicate guard passed must be false");
assert(summary.pre_apply_backup_verified === false, "fixture backup verified must be false");
assert(summary.manual_fulfillment_record_write_performed === false, "fixture record write performed must be false");
assert(summary.manual_fulfillment_record_apply_performed === false, "fixture record apply performed must be false");
assert(summary.append_only_ledger_write_performed === false, "fixture append-only ledger write must be false");
assert(summary.allocation_claim_created === false, "fixture allocation claim created must be false");
assert(summary.void_transfer_performed === false, "fixture VOID transfer must be false");
assert(summary.proposed_manual_fulfillment_record_key === "fixture_shape_only_not_written", "bad fixture record key");
assert(summary.proposed_record_body_hash === "fixture_shape_only_no_real_record_body_hash", "bad fixture record hash");
assert(summary.terminal_summary_key === "fixture_shape_only_no_terminal_summary_written", "bad terminal summary key");
assert(summary.terminal_summary_status === "closed_no_apply_fixture_shape_only", "bad terminal summary status");
assert(summary.terminal_authority_summary.all_write_authorities_false === true, "write authority summary must be true");
assert(summary.terminal_authority_summary.all_transfer_authorities_false === true, "transfer authority summary must be true");
assert(summary.terminal_authority_summary.public_mutation_authority_false === true, "public mutation authority summary must be true");
assert(summary.terminal_authority_summary.automatic_fulfillment_authority_false === true, "automatic fulfillment authority summary must be true");
assert(summary.terminal_summary_reason_codes.includes("fixture_shape_only"), "fixture shape reason missing");
assert(summary.terminal_summary_reason_codes.includes("closeout_not_applied"), "closeout not applied reason missing");
assert(summary.terminal_summary_reason_codes.includes("terminal_summary_authority_false"), "terminal authority false reason missing");
assert(summary.terminal_summary_reason_codes.includes("authority_remains_false"), "authority remains false reason missing");
assert(summary.terminal_summary_reason_codes.includes("no_record_written"), "no record written reason missing");
assert(summary.terminal_summary_reason_codes.includes("no_result_applied"), "no result applied reason missing");
assert(summary.terminal_summary_reason_codes.includes("no_closeout_applied"), "no closeout applied reason missing");
assert(summary.terminal_summary_reason_codes.includes("no_terminal_summary_applied"), "no terminal summary applied reason missing");
assert(summary.blocked_reason_codes.includes("blocked_terminal_summary_authority_false"), "blocked terminal summary authority false missing");
assert(summary.next_required_operator_action === "manual_fulfillment_record_write_apply_lane_remains_closed_until_separate_authority_activation", "bad next action");

console.log("buyer_packet_manual_fulfillment_record_write_apply_terminal_summary_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_terminal_summary_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-terminal-summary-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_terminal_summary_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_record_write_apply_terminal_summary_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_terminal_summary_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_terminal_summary_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_terminal_summary_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_TERMINAL_SUMMARY_HOLD_V1_GREEN"
