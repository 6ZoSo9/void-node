#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_LIVE_VERIFICATION_HOLD_V1_PROOF_BEGIN"

doc="docs/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-runtime-route-live-verification-hold-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-runtime-route-live-verification-hold-v1.json"
runtime_proof="ops/mainnet0/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-runtime-route-hold-v1-proof.sh"
src="src/index.ts"

marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_LIVE_VERIFICATION_HOLD_V1"
runtime_marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1"
summary_hold_marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_HOLD_V1"

json_route="/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1.json"
html_route="/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1"

test -f "$doc"
test -f "$fixture"
test -f "$runtime_proof"
test -f "$src"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"
grep -q "$json_route" "$doc"
grep -q "$html_route" "$doc"
grep -q "$json_route" "$fixture"
grep -q "$html_route" "$fixture"
grep -q "$json_route" "$src"
grep -q "$html_route" "$src"
grep -q "$runtime_marker" "$src"
grep -q "VOID_RUNTIME_LIVE_VERIFY=1" "$doc"
grep -q "read-only GET visibility" "$doc"

node <<'NODE'
const fs = require("fs");

const fixture = JSON.parse(fs.readFileSync("fixtures/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-runtime-route-live-verification-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_LIVE_VERIFICATION_HOLD_V1", "bad marker");
assert(fixture.scope === "public_node_runtime_live_verification_read_only", "bad scope");
assert(fixture.runtime_route_commit === "ef1bd625", "bad runtime route commit");
assert(fixture.service.name === "void-node-live.service", "bad service name");
assert(fixture.service.live_restart_default_enabled === false, "live restart must default false");
assert(fixture.service.live_restart_requires_env === "VOID_RUNTIME_LIVE_VERIFY=1", "bad live env gate");
assert(fixture.origins.local === "http://127.0.0.1:4100", "bad local origin");
assert(fixture.origins.public === "https://zoso-alienware-aurora-r7.taila47fd.ts.net", "bad public origin");
assert(fixture.routes.json === "/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1.json", "bad json route");
assert(fixture.routes.html === "/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1", "bad html route");
assert(fixture.expected_runtime_marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1", "bad expected runtime marker");

const live = fixture.expected_live_assertions;
assert(live.json_route_live_local === false, "json local must default false");
assert(live.json_route_live_public === false, "json public must default false");
assert(live.html_route_live_local === false, "html local must default false");
assert(live.html_route_live_public === false, "html public must default false");
assert(live.live_assertions_default_false_until_runtime_check === true, "live default false assertion required");

const boundary = fixture.read_only_boundary;
assert(Array.isArray(boundary.allowed_methods), "allowed_methods missing");
assert(boundary.allowed_methods.length === 1 && boundary.allowed_methods[0] === "GET", "only GET allowed");
for (const [key, value] of Object.entries(boundary)) {
  if (key === "allowed_methods") continue;
  assert(value === false, `read-only boundary not false: ${key}`);
}

const safety = fixture.public_safety;
for (const [key, value] of Object.entries(safety)) {
  if (key === "buyer_safe" || key === "reviewer_safe") {
    assert(value === true, `${key} must be true`);
  } else {
    assert(value === false, `public safety leak flag true: ${key}`);
  }
}

console.log("buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_json_semantics_green=true");
NODE

if grep -R "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PRIVATE_TERMINAL_ROLLUP_HOLD_V1\|usdc-void-buy-pool-buyer-packet-manual-fulfillment-private-terminal-rollup-hold-v1" docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_private_identifier_public_leak=false"
  exit 1
fi

if grep -q "$summary_hold_marker" "$src"; then
  echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_summary_hold_marker_runtime_leak=false"
  exit 1
fi

if grep -R "docs/private\|fixtures/private\|wallet_private_key\|seed phrase" "$doc" "$fixture" "$src" 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_private_path_or_secret_leak=false"
  exit 1
fi

if grep -R "mnemonic" "$doc" "$fixture" 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_public_artifact_mnemonic_leak=false"
  exit 1
fi

if grep -RE '"buyer_fulfilled"[[:space:]]*:[[:space:]]*true|"manual_fulfillment_record_written"[[:space:]]*:[[:space:]]*true|"manual_fulfillment_record_applied"[[:space:]]*:[[:space:]]*true|"allocation_claim_created"[[:space:]]*:[[:space:]]*true|"void_transfer_performed"[[:space:]]*:[[:space:]]*true|"wallet_signing_performed"[[:space:]]*:[[:space:]]*true|"treasury_movement_performed"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment_active"[[:space:]]*:[[:space:]]*true|"public_mutation_authorized"[[:space:]]*:[[:space:]]*true|"execution_authority"[[:space:]]*:[[:space:]]*true' fixtures/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-runtime-route-hold-v1.json fixtures/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-hold-v1.json; then
  echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_positive_action_or_authority_flag=false"
  exit 1
fi

mutation_hits="$(grep -nE "app\.(post|put|patch|delete)\(\"$json_route\"|app\.(post|put|patch|delete)\(\"$html_route\"" "$src" || true)"
test -z "$mutation_hits"

echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_static_runtime_route_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_read_only_boundary_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_authority_false_green=true"

if test "${VOID_RUNTIME_LIVE_VERIFY:-0}" != "1"; then
  echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_live_check_skipped=true"
  echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_LIVE_VERIFICATION_HOLD_V1_GREEN"
  exit 0
fi

local_origin="${VOID_RUNTIME_LOCAL_ORIGIN:-http://127.0.0.1:4100}"
public_origin="${VOID_RUNTIME_PUBLIC_ORIGIN:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"
service_name="${VOID_RUNTIME_SERVICE_NAME:-void-node-live.service}"

if command -v systemctl >/dev/null 2>&1; then
  if sudo -n true 2>/dev/null; then
    sudo -n systemctl restart "$service_name"
    sudo -n systemctl is-active --quiet "$service_name"
    echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_sudo_restart_performed=true"
  else
    echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_sudo_restart_skipped_no_tty=true"
    systemctl is-active --quiet "$service_name"
    echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_service_active_without_sudo_green=true"
  fi
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

curl -fsS "$local_origin$json_route" -o "$tmpdir/local.json"
curl -fsS "$local_origin$html_route" -o "$tmpdir/local.html"
curl -fsS "$public_origin$json_route" -o "$tmpdir/public.json"
curl -fsS "$public_origin$html_route" -o "$tmpdir/public.html"

grep -q "$runtime_marker" "$tmpdir/local.json"
grep -q "$runtime_marker" "$tmpdir/local.html"
grep -q "$runtime_marker" "$tmpdir/public.json"
grep -q "$runtime_marker" "$tmpdir/public.html"

grep -q "Authority:</strong> false" "$tmpdir/local.html"
grep -q "Authority:</strong> false" "$tmpdir/public.html"

node - "$tmpdir/local.json" "$tmpdir/public.json" <<'NODE'
const fs = require("fs");
const files = process.argv.slice(2);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

for (const file of files) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  assert(j.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1", `${file}: bad marker`);
  const rs = j.runtime_route_hold.public_runtime_summary;
  assert(rs.private_manual_evidence_chain_sealed === true, `${file}: chain sealed must be true`);
  assert(rs.chain_is_evidence_only === true, `${file}: evidence only must be true`);
  assert(rs.buyer_fulfilled === false, `${file}: buyer fulfilled must be false`);
  assert(rs.manual_fulfillment_record_written === false, `${file}: record written must be false`);
  assert(rs.manual_fulfillment_record_applied === false, `${file}: record applied must be false`);
  assert(rs.allocation_claim_created === false, `${file}: allocation claim must be false`);
  assert(rs.void_transfer_performed === false, `${file}: transfer must be false`);
  assert(rs.wallet_signing_performed === false, `${file}: wallet signing must be false`);
  assert(rs.treasury_movement_performed === false, `${file}: treasury movement must be false`);
  assert(rs.automatic_fulfillment_active === false, `${file}: automatic fulfillment must be false`);
  assert(rs.public_mutation_authorized === false, `${file}: public mutation must be false`);
  assert(rs.execution_authority === false, `${file}: execution authority must be false`);
}

console.log("buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_live_json_semantics_green=true");
NODE

echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_local_json_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_local_html_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_public_json_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_runtime_route_live_verification_hold_public_html_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_LIVE_VERIFICATION_HOLD_V1_GREEN"
