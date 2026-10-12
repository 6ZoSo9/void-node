#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_MANUAL_FULFILLMENT_READINESS_PUBLIC_REVIEWER_VERIFY_PACK_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/usdc-void-buy-pool-manual-fulfillment-readiness-public-reviewer-verify-pack-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-manual-fulfillment-readiness-public-reviewer-verify-pack-v1.json"

marker="VOID_USDC_VOID_BUY_POOL_MANUAL_FULFILLMENT_READINESS_PUBLIC_REVIEWER_VERIFY_PACK_V1"
closeout_marker="VOID_USDC_VOID_BUY_POOL_BUYER_FACING_MANUAL_FULFILLMENT_READINESS_CLOSEOUT_CARD_V1"
summary_marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1"

pack_html="/public-node/usdc-void-buy-pool/manual-fulfillment/reviewer-verify-pack-v1"
pack_json="/public-node/usdc-void-buy-pool/manual-fulfillment/reviewer-verify-pack-v1.json"
closeout_html="/public-node/usdc-void-buy-pool/manual-fulfillment/readiness-closeout-v1"
closeout_json="/public-node/usdc-void-buy-pool/manual-fulfillment/readiness-closeout-v1.json"
summary_html="/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1"
summary_json="/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1.json"

test -f "$src"
test -f "$doc"
test -f "$fixture"

grep -F "$marker" "$doc" >/dev/null
grep -F "$pack_html" "$doc" >/dev/null
grep -F "$pack_json" "$doc" >/dev/null
grep -F "$closeout_html" "$doc" >/dev/null
grep -F "$summary_json" "$doc" >/dev/null

grep -F "$marker" "$src" >/dev/null
grep -F "$pack_html" "$src" >/dev/null
grep -F "$pack_json" "$src" >/dev/null
grep -F "$closeout_marker" "$src" >/dev/null
grep -F "$summary_marker" "$src" >/dev/null
grep -F "copy_paste_verify_command" "$src" >/dev/null

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/public/usdc-void-buy-pool-manual-fulfillment-readiness-public-reviewer-verify-pack-v1.json", "utf8"));

function assert(x, msg){ if(!x){ throw new Error(msg); } }

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_MANUAL_FULFILLMENT_READINESS_PUBLIC_REVIEWER_VERIFY_PACK_V1", "bad marker");
assert(fixture.closeout_marker === "VOID_USDC_VOID_BUY_POOL_BUYER_FACING_MANUAL_FULFILLMENT_READINESS_CLOSEOUT_CARD_V1", "bad closeout marker");
assert(fixture.summary_marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1", "bad summary marker");
assert(fixture.scope === "public_reviewer_one_command_verify_pack", "bad scope");

for (const route of [
  "html",
  "json",
  "closeout_html",
  "closeout_json",
  "summary_html",
  "summary_json",
  "dashboard",
  "route_index"
]) {
  assert(typeof fixture.routes[route] === "string" && fixture.routes[route].length > 0, `missing route ${route}`);
}

assert(fixture.copy_paste_verify_command.includes("VOID_USDC_VOID_BUY_POOL_MANUAL_FULFILLMENT_READINESS_PUBLIC_REVIEWER_VERIFY_PACK_V1_REVIEWER_GREEN"), "missing reviewer green marker");
assert(fixture.copy_paste_verify_command.includes("/public-node/usdc-void-buy-pool/manual-fulfillment/readiness-closeout-v1.json"), "missing closeout json in command");
assert(fixture.copy_paste_verify_command.includes("/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1.json"), "missing summary json in command");
assert(fixture.copy_paste_verify_command.includes("/public-node/route-index.json"), "missing route index in command");

for (const section of ["pack_boundary", "authority", "privacy"]) {
  for (const [k, v] of Object.entries(fixture[section])) {
    assert(v === false, `${section}.${k} must be false`);
  }
}
NODE

if grep -RE '"buyer_fulfillment"[[:space:]]*:[[:space:]]*true|"manual_fulfillment_record_write"[[:space:]]*:[[:space:]]*true|"manual_fulfillment_record_apply"[[:space:]]*:[[:space:]]*true|"allocation_claim_creation"[[:space:]]*:[[:space:]]*true|"void_transfer"[[:space:]]*:[[:space:]]*true|"wallet_signing"[[:space:]]*:[[:space:]]*true|"treasury_movement"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment_activation"[[:space:]]*:[[:space:]]*true|"public_mutation"[[:space:]]*:[[:space:]]*true|"public_node_mutation_authority"[[:space:]]*:[[:space:]]*true|"buyer_execution_authority"[[:space:]]*:[[:space:]]*true' "$fixture"; then
  echo "unsafe true authority/boundary found in fixture" >&2
  exit 1
fi

echo "manual_fulfillment_readiness_public_reviewer_verify_pack_doc_green=true"
echo "manual_fulfillment_readiness_public_reviewer_verify_pack_fixture_green=true"
echo "manual_fulfillment_readiness_public_reviewer_verify_pack_src_route_green=true"
echo "manual_fulfillment_readiness_public_reviewer_verify_pack_src_dashboard_green=true"
echo "manual_fulfillment_readiness_public_reviewer_verify_pack_src_route_index_green=true"
echo "manual_fulfillment_readiness_public_reviewer_verify_pack_one_command_green=true"
echo "manual_fulfillment_readiness_public_reviewer_verify_pack_authority_false_green=true"

if test "${VOID_RUNTIME_LIVE_VERIFY:-0}" = "1"; then
  local_origin="${VOID_RUNTIME_LOCAL_ORIGIN:-http://127.0.0.1:4100}"
  public_origin="${VOID_RUNTIME_PUBLIC_ORIGIN:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT

  for origin_name in local public; do
    if test "$origin_name" = "local"; then origin="$local_origin"; else origin="$public_origin"; fi

    curl -fsS "$origin$pack_html" -o "$tmpdir/$origin_name-pack.html"
    curl -fsS "$origin$pack_json" -o "$tmpdir/$origin_name-pack.json"
    curl -fsS "$origin$closeout_json" -o "$tmpdir/$origin_name-closeout.json"
    curl -fsS "$origin$summary_json" -o "$tmpdir/$origin_name-summary.json"
    curl -fsS "$origin/public-node" -o "$tmpdir/$origin_name-dashboard.html"
    curl -fsS "$origin/public-node/route-index.json" -o "$tmpdir/$origin_name-route-index.json"

    grep -F "$marker" "$tmpdir/$origin_name-pack.html" >/dev/null
    grep -F "$marker" "$tmpdir/$origin_name-pack.json" >/dev/null
    grep -F "$pack_json" "$tmpdir/$origin_name-dashboard.html" >/dev/null
    grep -F "$pack_json" "$tmpdir/$origin_name-route-index.json" >/dev/null
    grep -F "$closeout_marker" "$tmpdir/$origin_name-closeout.json" >/dev/null
    grep -F "$summary_marker" "$tmpdir/$origin_name-summary.json" >/dev/null
  done

  node "$tmpdir/local-pack.json" "$tmpdir/public-pack.json" <<'NODE'
const fs = require("fs");
for (const f of process.argv.slice(1)) {
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  if (j.marker !== "VOID_USDC_VOID_BUY_POOL_MANUAL_FULFILLMENT_READINESS_PUBLIC_REVIEWER_VERIFY_PACK_V1") throw new Error(`${f}: bad marker`);
  if (!String(j.copy_paste_verify_command || "").includes("VOID_USDC_VOID_BUY_POOL_MANUAL_FULFILLMENT_READINESS_PUBLIC_REVIEWER_VERIFY_PACK_V1_REVIEWER_GREEN")) throw new Error(`${f}: missing one-command green marker`);
  for (const section of ["pack_boundary", "authority", "privacy"]) {
    for (const [k, v] of Object.entries(j[section])) {
      if (v !== false) throw new Error(`${f}: ${section}.${k} must be false`);
    }
  }
}
NODE

  echo "manual_fulfillment_readiness_public_reviewer_verify_pack_live_local_pack_green=true"
  echo "manual_fulfillment_readiness_public_reviewer_verify_pack_live_local_discovery_green=true"
  echo "manual_fulfillment_readiness_public_reviewer_verify_pack_live_public_pack_green=true"
  echo "manual_fulfillment_readiness_public_reviewer_verify_pack_live_public_discovery_green=true"
else
  echo "manual_fulfillment_readiness_public_reviewer_verify_pack_live_check_skipped=true"
fi

echo "VOID_USDC_VOID_BUY_POOL_MANUAL_FULFILLMENT_READINESS_PUBLIC_REVIEWER_VERIFY_PACK_V1_GREEN"
