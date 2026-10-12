#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_DISCOVERY_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-discovery-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-discovery-v1.json"

marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_DISCOVERY_V1"
route_marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1"
html_route="/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1"
json_route="/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1.json"

test -f "$src"
test -f "$doc"
test -f "$fixture"

grep -F "$marker" "$doc" >/dev/null
grep -F "$html_route" "$doc" >/dev/null
grep -F "$json_route" "$doc" >/dev/null
grep -F "$marker" "$src" >/dev/null
grep -F "$html_route" "$src" >/dev/null
grep -F "$json_route" "$src" >/dev/null
grep -F "$route_marker" "$src" >/dev/null

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-discovery-v1.json", "utf8"));

function assert(x, msg){ if(!x){ throw new Error(msg); } }

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_DISCOVERY_V1", "bad marker");
assert(fixture.route_marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1", "bad route marker");
assert(fixture.scope === "public_read_only_discovery", "bad scope");
assert(fixture.routes.html === "/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1", "bad html route");
assert(fixture.routes.json === "/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1.json", "bad json route");
assert(fixture.discovery_surfaces.public_node_dashboard === "/public-node", "bad dashboard discovery");
assert(fixture.discovery_surfaces.route_index === "/public-node/route-index.json", "bad route index discovery");

for (const [k, v] of Object.entries(fixture.authority)) {
  assert(v === false, `authority ${k} must be false`);
}
for (const [k, v] of Object.entries(fixture.privacy)) {
  assert(v === false, `privacy ${k} must be false`);
}
NODE

if grep -RE '"buyer_fulfillment"[[:space:]]*:[[:space:]]*true|"manual_fulfillment_record_write"[[:space:]]*:[[:space:]]*true|"manual_fulfillment_record_apply"[[:space:]]*:[[:space:]]*true|"allocation_claim_creation"[[:space:]]*:[[:space:]]*true|"void_transfer"[[:space:]]*:[[:space:]]*true|"wallet_signing"[[:space:]]*:[[:space:]]*true|"treasury_movement"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment_activation"[[:space:]]*:[[:space:]]*true|"public_mutation"[[:space:]]*:[[:space:]]*true' "$fixture"; then
  echo "unsafe true authority found in fixture" >&2
  exit 1
fi

echo "buyer_packet_manual_fulfillment_public_readiness_summary_discovery_doc_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_discovery_fixture_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_discovery_src_dashboard_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_discovery_src_route_index_green=true"
echo "buyer_packet_manual_fulfillment_public_readiness_summary_discovery_authority_false_green=true"

if test "${VOID_RUNTIME_LIVE_VERIFY:-0}" = "1"; then
  local_origin="${VOID_RUNTIME_LOCAL_ORIGIN:-http://127.0.0.1:4100}"
  public_origin="${VOID_RUNTIME_PUBLIC_ORIGIN:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT

  curl -fsS "$local_origin/public-node" -o "$tmpdir/local-dashboard.html"
  curl -fsS "$local_origin/public-node/route-index.json" -o "$tmpdir/local-route-index.json"
  curl -fsS "$public_origin/public-node" -o "$tmpdir/public-dashboard.html"
  curl -fsS "$public_origin/public-node/route-index.json" -o "$tmpdir/public-route-index.json"

  grep -F "$marker" "$tmpdir/local-dashboard.html" >/dev/null
  grep -F "$html_route" "$tmpdir/local-dashboard.html" >/dev/null
  grep -F "$json_route" "$tmpdir/local-dashboard.html" >/dev/null
  grep -F "$html_route" "$tmpdir/local-route-index.json" >/dev/null
  grep -F "$json_route" "$tmpdir/local-route-index.json" >/dev/null
  grep -F "$route_marker" "$tmpdir/local-route-index.json" >/dev/null

  grep -F "$marker" "$tmpdir/public-dashboard.html" >/dev/null
  grep -F "$html_route" "$tmpdir/public-dashboard.html" >/dev/null
  grep -F "$json_route" "$tmpdir/public-dashboard.html" >/dev/null
  grep -F "$html_route" "$tmpdir/public-route-index.json" >/dev/null
  grep -F "$json_route" "$tmpdir/public-route-index.json" >/dev/null
  grep -F "$route_marker" "$tmpdir/public-route-index.json" >/dev/null

  echo "buyer_packet_manual_fulfillment_public_readiness_summary_discovery_live_local_dashboard_green=true"
  echo "buyer_packet_manual_fulfillment_public_readiness_summary_discovery_live_local_route_index_green=true"
  echo "buyer_packet_manual_fulfillment_public_readiness_summary_discovery_live_public_dashboard_green=true"
  echo "buyer_packet_manual_fulfillment_public_readiness_summary_discovery_live_public_route_index_green=true"
else
  echo "buyer_packet_manual_fulfillment_public_readiness_summary_discovery_live_check_skipped=true"
fi

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_DISCOVERY_V1_GREEN"
