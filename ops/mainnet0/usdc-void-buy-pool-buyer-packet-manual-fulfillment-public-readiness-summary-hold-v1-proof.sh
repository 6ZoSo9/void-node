#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_HOLD_V1_PROOF_BEGIN"

doc="docs/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-hold-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"
grep -q "public/read-only" "$doc"
grep -q "closed private evidence only" "$doc"
grep -q "execution authority: false" "$doc"
grep -q "Future fulfillment or activation" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_HOLD_V1", "bad marker");
assert(fixture.scope === "public_read_only", "bad scope");
assert(fixture.private_chain_status === "sealed_closed_private_evidence_only", "bad private chain status");

const s = fixture.public_safe_summary;
assert(s.manual_fulfillment_chain_sealed === true, "chain sealed must be true");
assert(s.chain_is_evidence_only === true, "chain evidence only must be true");
assert(s.buyer_fulfilled === false, "buyer fulfilled must be false");
assert(s.manual_fulfillment_record_written === false, "record written must be false");
assert(s.manual_fulfillment_record_applied === false, "record applied must be false");
assert(s.allocation_claim_created === false, "allocation claim created must be false");
assert(s.void_transfer_performed === false, "VOID transfer must be false");
assert(s.wallet_signing_performed === false, "wallet signing must be false");
assert(s.treasury_movement_performed === false, "treasury movement must be false");
assert(s.automatic_fulfillment_active === false, "automatic fulfillment must be false");
assert(s.public_mutation_authorized === false, "public mutation authorized must be false");
assert(s.execution_authority === false, "execution authority must be false");
assert(s.summary_is_execution_packet === false, "summary must not be execution packet");
assert(s.summary_is_authority === false, "summary must not be authority");
assert(s.summary_is_public_mutation === false, "summary must not be public mutation");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

const req = fixture.future_activation_requirements;
assert(req.separate_authority_activation_path_required === true, "separate authority path required");
assert(req.new_operator_review_required === true, "new review required");
assert(req.new_operator_decision_required === true, "new decision required");
assert(req.new_authority_record_required === true, "new authority record required");
assert(req.new_activation_gate_required === true, "new activation gate required");
assert(req.new_preflight_required === true, "new preflight required");
assert(req.new_execution_packet_required === true, "new execution packet required");
assert(req.new_duplicate_guard_required === true, "new duplicate guard required");
assert(req.new_cross_box_verification_required === true, "new cross-box required");
assert(req.new_precision_final_sync_required === true, "new Precision sync required");
assert(req.no_write_apply_transfer_or_public_mutation_before_all_requirements_green === true, "no write/apply/transfer/public mutation before all green required");

const safety = fixture.public_safety;
assert(safety.contains_private_buyer_data === false, "private buyer data leak flag true");
assert(safety.contains_private_operator_notes === false, "private operator notes leak flag true");
assert(safety.contains_wallet_secret === false, "wallet secret leak flag true");
assert(safety.contains_private_document_path === false, "private document path leak flag true");
assert(safety.contains_execution_material === false, "execution material leak flag true");
assert(safety.contains_transfer_instruction === false, "transfer instruction leak flag true");
assert(safety.contains_mutation_instruction === false, "mutation instruction leak flag true");
assert(safety.buyer_safe === true, "buyer safe must be true");
assert(safety.reviewer_safe === true, "reviewer safe must be true");

console.log("buyer_packet_manual_fulfillment_public_readiness_summary_hold_json_semantics_green=true");
NODE

if grep -RE "docs/private|fixtures/private|private_operator_redacted|wallet_private_key|seed phrase|mnemonic" "$doc" "$fixture"; then
  echo "buyer_packet_manual_fulfillment_public_readiness_summary_hold_private_path_or_secret_leak=false"
  exit 1
fi

if grep -RE '"contains_private_buyer_data"[[:space:]]*:[[:space:]]*true|"contains_private_operator_notes"[[:space:]]*:[[:space:]]*true|"contains_wallet_secret"[[:space:]]*:[[:space:]]*true|"contains_private_document_path"[[:space:]]*:[[:space:]]*true|"contains_execution_material"[[:space:]]*:[[:space:]]*true|"contains_transfer_instruction"[[:space:]]*:[[:space:]]*true|"contains_mutation_instruction"[[:space:]]*:[[:space:]]*true' "$fixture"; then
  echo "buyer_packet_manual_fulfillment_public_readiness_summary_hold_positive_leak_flag=false"
  exit 1
fi

if grep -R "$marker" src 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_public_readiness_summary_hold_runtime_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_public_readiness_summary_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_hold_public_safe_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_hold_no_runtime_route_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_HOLD_V1_GREEN"
