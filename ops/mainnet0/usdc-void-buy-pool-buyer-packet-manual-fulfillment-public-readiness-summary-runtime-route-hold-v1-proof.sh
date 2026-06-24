#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1_PROOF_BEGIN"

doc="docs/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-runtime-route-hold-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-runtime-route-hold-v1.json"
summary_fixture="fixtures/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-hold-v1.json"
src="src/index.ts"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1"
json_route="/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1.json"
html_route="/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1"

test -f "$doc"
test -f "$fixture"
test -f "$summary_fixture"
test -f "$src"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"
grep -q "$marker" "$src"
grep -q "$json_route" "$doc"
grep -q "$html_route" "$doc"
grep -q "$json_route" "$fixture"
grep -q "$html_route" "$fixture"
grep -q "$json_route" "$src"
grep -q "$html_route" "$src"
grep -q "public/read-only" "$doc"
grep -q "Authority:</strong> false" "$src"
grep -q "not fulfillment" "$src"

node <<'NODE'
const fs = require("fs");
const runtime = JSON.parse(fs.readFileSync("fixtures/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-runtime-route-hold-v1.json", "utf8"));
const summary = JSON.parse(fs.readFileSync("fixtures/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(runtime.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1", "bad runtime marker");
assert(runtime.scope === "public_node_runtime_read_only", "bad runtime scope");
assert(runtime.routes.json === "/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1.json", "bad json route");
assert(runtime.routes.html === "/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1", "bad html route");
assert(runtime.source_summary_fixture === "fixtures/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-hold-v1.json", "bad source summary fixture");

const rs = runtime.public_runtime_summary;
assert(rs.private_manual_evidence_chain_sealed === true, "private manual evidence chain sealed must be true");
assert(rs.chain_is_evidence_only === true, "chain evidence-only must be true");
assert(rs.buyer_fulfilled === false, "buyer fulfilled must be false");
assert(rs.manual_fulfillment_record_written === false, "record written must be false");
assert(rs.manual_fulfillment_record_applied === false, "record applied must be false");
assert(rs.allocation_claim_created === false, "allocation claim created must be false");
assert(rs.void_transfer_performed === false, "VOID transfer must be false");
assert(rs.wallet_signing_performed === false, "wallet signing must be false");
assert(rs.treasury_movement_performed === false, "treasury movement must be false");
assert(rs.automatic_fulfillment_active === false, "automatic fulfillment must be false");
assert(rs.public_mutation_authorized === false, "public mutation must be false");
assert(rs.execution_authority === false, "execution authority must be false");

for (const [key, value] of Object.entries(runtime.authority)) {
  assert(value === false, `runtime authority not false: ${key}`);
}

const safety = runtime.public_safety;
assert(safety.contains_private_buyer_data === false, "private buyer data leak flag true");
assert(safety.contains_private_operator_notes === false, "private operator notes leak flag true");
assert(safety.contains_private_lane_identifier === false, "private lane identifier leak flag true");
assert(safety.contains_private_document_path === false, "private document path leak flag true");
assert(safety.contains_wallet_secret === false, "wallet secret leak flag true");
assert(safety.contains_ledger_internal === false, "ledger internal leak flag true");
assert(safety.contains_execution_material === false, "execution material leak flag true");
assert(safety.contains_transfer_instruction === false, "transfer instruction leak flag true");
assert(safety.contains_mutation_instruction === false, "mutation instruction leak flag true");
assert(safety.buyer_safe === true, "buyer safe must be true");
assert(safety.reviewer_safe === true, "reviewer safe must be true");

assert(summary.scope === "public_read_only", "source summary must remain public read only");
assert(summary.public_safe_summary.execution_authority === false, "source summary execution authority must be false");

console.log("buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_hold_json_semantics_green=true");
NODE

if grep -R "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PRIVATE_TERMINAL_ROLLUP_HOLD_V1\|usdc-void-buy-pool-buyer-packet-manual-fulfillment-private-terminal-rollup-hold-v1" docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_hold_private_identifier_public_leak=false"
  exit 1
fi

if grep -R "docs/private\\|fixtures/private\\|wallet_private_key\\|seed phrase" "$doc" "$fixture" "$src" 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_hold_private_path_or_secret_leak=false"
  exit 1
fi

if grep -R "mnemonic" "$doc" "$fixture" 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_hold_public_artifact_mnemonic_leak=false"
  exit 1
fi

if grep -RE '"buyer_fulfilled"[[:space:]]*:[[:space:]]*true|"manual_fulfillment_record_written"[[:space:]]*:[[:space:]]*true|"manual_fulfillment_record_applied"[[:space:]]*:[[:space:]]*true|"allocation_claim_created"[[:space:]]*:[[:space:]]*true|"void_transfer_performed"[[:space:]]*:[[:space:]]*true|"wallet_signing_performed"[[:space:]]*:[[:space:]]*true|"treasury_movement_performed"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment_active"[[:space:]]*:[[:space:]]*true|"public_mutation_authorized"[[:space:]]*:[[:space:]]*true|"execution_authority"[[:space:]]*:[[:space:]]*true' "$fixture" "$summary_fixture"; then
  echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_hold_positive_authority_or_action_flag=false"
  exit 1
fi

mutation_hits="$(grep -nE "app\.(post|put|patch|delete)\(\"$json_route\"|app\.(post|put|patch|delete)\(\"$html_route\"" "$src" || true)"
test -z "$mutation_hits"

route_count_json="$(grep -F "$json_route" "$src" | wc -l | tr -d ' ')"
route_count_html="$(grep -F "$html_route" "$src" | wc -l | tr -d ' ')"
test "$route_count_json" -ge 2
test "$route_count_html" -ge 2

echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_hold_src_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_hold_public_safe_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_hold_read_only_routes_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1_GREEN"
