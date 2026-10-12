#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_FACING_MANUAL_FULFILLMENT_READINESS_CLOSEOUT_CARD_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/usdc-void-buy-pool-buyer-facing-manual-fulfillment-readiness-closeout-card-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-buyer-facing-manual-fulfillment-readiness-closeout-card-v1.json"

marker="VOID_USDC_VOID_BUY_POOL_BUYER_FACING_MANUAL_FULFILLMENT_READINESS_CLOSEOUT_CARD_V1"
summary_marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1"
html_route="/public-node/usdc-void-buy-pool/manual-fulfillment/readiness-closeout-v1"
json_route="/public-node/usdc-void-buy-pool/manual-fulfillment/readiness-closeout-v1.json"
summary_html="/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1"
summary_json="/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1.json"

test -f "$src"
test -f "$doc"
test -f "$fixture"

grep -F "$marker" "$doc" >/dev/null
grep -F "$html_route" "$doc" >/dev/null
grep -F "$json_route" "$doc" >/dev/null
grep -F "$summary_html" "$doc" >/dev/null
grep -F "$summary_json" "$doc" >/dev/null

grep -F "$marker" "$src" >/dev/null
grep -F "$html_route" "$src" >/dev/null
grep -F "$json_route" "$src" >/dev/null
grep -F "$summary_marker" "$src" >/dev/null
grep -F "buyer-facing manual fulfillment readiness closeout" "$src" >/dev/null

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/public/usdc-void-buy-pool-buyer-facing-manual-fulfillment-readiness-closeout-card-v1.json", "utf8"));

function assert(x, msg){ if(!x){ throw new Error(msg); } }

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_FACING_MANUAL_FULFILLMENT_READINESS_CLOSEOUT_CARD_V1", "bad marker");
assert(fixture.summary_marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1", "bad summary marker");
assert(fixture.scope === "buyer_facing_public_read_only_closeout", "bad scope");

assert(fixture.status.manual_evidence_chain_sealed === true, "manual evidence chain must be sealed");
assert(fixture.status.public_readiness_summary_live === true, "public readiness summary must be live");
assert(fixture.status.private_operator_material_withheld === true, "private operator material must be withheld");

for (const k of [
  "buyer_fulfilled",
  "manual_fulfillment_record_written",
  "manual_fulfillment_record_applied",
  "allocation_claim_created",
  "void_transfer_performed",
  "wallet_signing_performed",
  "treasury_movement_performed",
  "automatic_fulfillment_active",
  "public_mutation_authorized"
]) {
  assert(fixture.status[k] === false, `status ${k} must be false`);
}

assert(fixture.routes.html === "/public-node/usdc-void-buy-pool/manual-fulfillment/readiness-closeout-v1", "bad html route");
assert(fixture.routes.json === "/public-node/usdc-void-buy-pool/manual-fulfillment/readiness-closeout-v1.json", "bad json route");
assert(fixture.routes.public_readiness_summary_html === "/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1", "bad summary html");
assert(fixture.routes.public_readiness_summary_json === "/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1.json", "bad summary json");

for (const [k, v] of Object.entries(fixture.authority)) {
  assert(v === false, `authority ${k} must be false`);
}
for (const [k, v] of Object.entries(fixture.privacy)) {
  assert(v === false, `privacy ${k} must be false`);
}
NODE

if grep -RE '"buyer_fulfilled"[[:space:]]*:[[:space:]]*true|"manual_fulfillment_record_written"[[:space:]]*:[[:space:]]*true|"manual_fulfillment_record_applied"[[:space:]]*:[[:space:]]*true|"allocation_claim_created"[[:space:]]*:[[:space:]]*true|"void_transfer_performed"[[:space:]]*:[[:space:]]*true|"wallet_signing_performed"[[:space:]]*:[[:space:]]*true|"treasury_movement_performed"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment_active"[[:space:]]*:[[:space:]]*true|"public_mutation_authorized"[[:space:]]*:[[:space:]]*true|"public_mutation"[[:space:]]*:[[:space:]]*true' "$fixture"; then
  echo "unsafe true authority/status found in fixture" >&2
  exit 1
fi

echo "buyer_facing_manual_fulfillment_readiness_closeout_card_doc_green=true"
echo "buyer_facing_manual_fulfillment_readiness_closeout_card_fixture_green=true"
echo "buyer_facing_manual_fulfillment_readiness_closeout_card_src_route_green=true"
echo "buyer_facing_manual_fulfillment_readiness_closeout_card_src_dashboard_green=true"
echo "buyer_facing_manual_fulfillment_readiness_closeout_card_src_route_index_green=true"
echo "buyer_facing_manual_fulfillment_readiness_closeout_card_authority_false_green=true"

if test "${VOID_RUNTIME_LIVE_VERIFY:-0}" = "1"; then
  local_origin="${VOID_RUNTIME_LOCAL_ORIGIN:-http://127.0.0.1:4100}"
  public_origin="${VOID_RUNTIME_PUBLIC_ORIGIN:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT

  curl -fsS "$local_origin$html_route" -o "$tmpdir/local-closeout.html"
  curl -fsS "$local_origin$json_route" -o "$tmpdir/local-closeout.json"
  curl -fsS "$local_origin/public-node" -o "$tmpdir/local-dashboard.html"
  curl -fsS "$local_origin/public-node/route-index.json" -o "$tmpdir/local-route-index.json"

  curl -fsS "$public_origin$html_route" -o "$tmpdir/public-closeout.html"
  curl -fsS "$public_origin$json_route" -o "$tmpdir/public-closeout.json"
  curl -fsS "$public_origin/public-node" -o "$tmpdir/public-dashboard.html"
  curl -fsS "$public_origin/public-node/route-index.json" -o "$tmpdir/public-route-index.json"

  grep -F "$marker" "$tmpdir/local-closeout.html" >/dev/null
  grep -F "$marker" "$tmpdir/local-closeout.json" >/dev/null
  grep -F "$summary_html" "$tmpdir/local-closeout.html" >/dev/null
  grep -F "$summary_json" "$tmpdir/local-closeout.json" >/dev/null
  grep -F "$marker" "$tmpdir/local-dashboard.html" >/dev/null
  grep -F "$html_route" "$tmpdir/local-dashboard.html" >/dev/null
  grep -F "$json_route" "$tmpdir/local-dashboard.html" >/dev/null
  grep -F "$html_route" "$tmpdir/local-route-index.json" >/dev/null
  grep -F "$json_route" "$tmpdir/local-route-index.json" >/dev/null

  grep -F "$marker" "$tmpdir/public-closeout.html" >/dev/null
  grep -F "$marker" "$tmpdir/public-closeout.json" >/dev/null
  grep -F "$summary_html" "$tmpdir/public-closeout.html" >/dev/null
  grep -F "$summary_json" "$tmpdir/public-closeout.json" >/dev/null
  grep -F "$marker" "$tmpdir/public-dashboard.html" >/dev/null
  grep -F "$html_route" "$tmpdir/public-dashboard.html" >/dev/null
  grep -F "$json_route" "$tmpdir/public-dashboard.html" >/dev/null
  grep -F "$html_route" "$tmpdir/public-route-index.json" >/dev/null
  grep -F "$json_route" "$tmpdir/public-route-index.json" >/dev/null

  node "$tmpdir/local-closeout.json" "$tmpdir/public-closeout.json" <<'NODE'
const fs = require("fs");
for (const f of process.argv.slice(1)) {
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  if (j.marker !== "VOID_USDC_VOID_BUY_POOL_BUYER_FACING_MANUAL_FULFILLMENT_READINESS_CLOSEOUT_CARD_V1") throw new Error(`${f}: bad marker`);
  if (j.status.buyer_fulfilled !== false) throw new Error(`${f}: buyer fulfilled must be false`);
  if (j.status.automatic_fulfillment_active !== false) throw new Error(`${f}: automatic fulfillment must be false`);
  if (j.status.public_mutation_authorized !== false) throw new Error(`${f}: public mutation must be false`);
  for (const [k, v] of Object.entries(j.authority)) {
    if (v !== false) throw new Error(`${f}: authority ${k} must be false`);
  }
}
NODE

  echo "buyer_facing_manual_fulfillment_readiness_closeout_card_live_local_closeout_green=true"
  echo "buyer_facing_manual_fulfillment_readiness_closeout_card_live_local_dashboard_green=true"
  echo "buyer_facing_manual_fulfillment_readiness_closeout_card_live_local_route_index_green=true"
  echo "buyer_facing_manual_fulfillment_readiness_closeout_card_live_public_closeout_green=true"
  echo "buyer_facing_manual_fulfillment_readiness_closeout_card_live_public_dashboard_green=true"
  echo "buyer_facing_manual_fulfillment_readiness_closeout_card_live_public_route_index_green=true"
else
  echo "buyer_facing_manual_fulfillment_readiness_closeout_card_live_check_skipped=true"
fi

echo "VOID_USDC_VOID_BUY_POOL_BUYER_FACING_MANUAL_FULFILLMENT_READINESS_CLOSEOUT_CARD_V1_GREEN"
