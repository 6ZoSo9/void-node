#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ENABLEMENT_PREFLIGHT_CLOSEOUT_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/usdc-void-buy-pool-automatic-payment-enablement-preflight-closeout-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-automatic-payment-enablement-preflight-closeout-v1.json"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ENABLEMENT_PREFLIGHT_CLOSEOUT_V1"
reviewer_marker="VOID_USDC_VOID_BUY_POOL_MANUAL_FULFILLMENT_READINESS_PUBLIC_REVIEWER_VERIFY_PACK_V1"
closeout_marker="VOID_USDC_VOID_BUY_POOL_BUYER_FACING_MANUAL_FULFILLMENT_READINESS_CLOSEOUT_CARD_V1"
summary_marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1"

html_route="/public-node/usdc-void-buy-pool/automatic-payment-enablement/preflight-closeout-v1"
json_route="/public-node/usdc-void-buy-pool/automatic-payment-enablement/preflight-closeout-v1.json"

test -f "$src"
test -f "$doc"
test -f "$fixture"

grep -F "$marker" "$doc" >/dev/null
grep -F "$html_route" "$doc" >/dev/null
grep -F "$json_route" "$doc" >/dev/null
grep -F "Required before actual enablement" "$doc" >/dev/null

grep -F "$marker" "$src" >/dev/null
grep -F "$html_route" "$src" >/dev/null
grep -F "$json_route" "$src" >/dev/null
grep -F "$reviewer_marker" "$src" >/dev/null
grep -F "Automatic payment enablement preflight closeout" "$src" >/dev/null

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/public/usdc-void-buy-pool-automatic-payment-enablement-preflight-closeout-v1.json", "utf8"));

function assert(x, msg){ if(!x){ throw new Error(msg); } }

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ENABLEMENT_PREFLIGHT_CLOSEOUT_V1", "bad marker");
assert(fixture.scope === "public_read_only_automatic_payment_enablement_preflight", "bad scope");
assert(fixture.status.manual_fulfillment_readiness_stack_final_synced === true, "manual stack must be final synced");
assert(fixture.status.public_reviewer_verify_pack_final_synced === true, "reviewer pack must be final synced");
assert(fixture.status.automatic_payment_enablement_preflight_closed === true, "preflight must be closed");

for (const k of [
  "automatic_payment_execution_enabled",
  "automatic_fulfillment_enabled",
  "buyer_fulfillment_enabled",
  "wallet_signing_enabled",
  "treasury_movement_enabled",
  "public_mutation_enabled"
]) {
  assert(fixture.status[k] === false, `status ${k} must be false`);
}

for (const [k, v] of Object.entries(fixture.authority)) {
  assert(v === false, `authority ${k} must be false`);
}
for (const [k, v] of Object.entries(fixture.privacy)) {
  assert(v === false, `privacy ${k} must be false`);
}

assert(fixture.sealed_markers.reviewer_verify_pack === "VOID_USDC_VOID_BUY_POOL_MANUAL_FULFILLMENT_READINESS_PUBLIC_REVIEWER_VERIFY_PACK_V1", "bad reviewer marker");
assert(fixture.sealed_markers.buyer_facing_closeout === "VOID_USDC_VOID_BUY_POOL_BUYER_FACING_MANUAL_FULFILLMENT_READINESS_CLOSEOUT_CARD_V1", "bad closeout marker");
assert(fixture.sealed_markers.public_readiness_summary === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1", "bad summary marker");

for (const required of [
  "private_operator_activation_packet",
  "explicit_operator_approval_record",
  "signer_wallet_access_private_and_explicit",
  "duplicate_payment_guard_in_live_path",
  "verified_receipt_parser_in_live_path",
  "inventory_exhaustion_closeout_proof",
  "rollback_disable_switch_proof"
]) {
  assert(fixture.required_before_actual_enablement.includes(required), `missing requirement ${required}`);
}
NODE

if grep -RE '"automatic_payment_execution"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment"[[:space:]]*:[[:space:]]*true|"buyer_fulfillment"[[:space:]]*:[[:space:]]*true|"wallet_signing"[[:space:]]*:[[:space:]]*true|"treasury_movement"[[:space:]]*:[[:space:]]*true|"public_mutation"[[:space:]]*:[[:space:]]*true|"automatic_payment_execution_enabled"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment_enabled"[[:space:]]*:[[:space:]]*true|"wallet_signing_enabled"[[:space:]]*:[[:space:]]*true|"public_mutation_enabled"[[:space:]]*:[[:space:]]*true' "$fixture"; then
  echo "unsafe true automatic payment/fulfillment authority found in fixture" >&2
  exit 1
fi

echo "automatic_payment_enablement_preflight_closeout_doc_green=true"
echo "automatic_payment_enablement_preflight_closeout_fixture_green=true"
echo "automatic_payment_enablement_preflight_closeout_src_route_green=true"
echo "automatic_payment_enablement_preflight_closeout_src_dashboard_green=true"
echo "automatic_payment_enablement_preflight_closeout_src_route_index_green=true"
echo "automatic_payment_enablement_preflight_closeout_required_before_enablement_green=true"
echo "automatic_payment_enablement_preflight_closeout_authority_false_green=true"

if test "${VOID_RUNTIME_LIVE_VERIFY:-0}" = "1"; then
  local_origin="${VOID_RUNTIME_LOCAL_ORIGIN:-http://127.0.0.1:4100}"
  public_origin="${VOID_RUNTIME_PUBLIC_ORIGIN:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT

  for origin_name in local public; do
    if test "$origin_name" = "local"; then origin="$local_origin"; else origin="$public_origin"; fi

    curl -fsS "$origin$html_route" -o "$tmpdir/$origin_name-preflight.html"
    curl -fsS "$origin$json_route" -o "$tmpdir/$origin_name-preflight.json"
    curl -fsS "$origin/public-node" -o "$tmpdir/$origin_name-dashboard.html"
    curl -fsS "$origin/public-node/route-index.json" -o "$tmpdir/$origin_name-route-index.json"

    grep -F "$marker" "$tmpdir/$origin_name-preflight.html" >/dev/null
    grep -F "$marker" "$tmpdir/$origin_name-preflight.json" >/dev/null
    grep -F "$json_route" "$tmpdir/$origin_name-dashboard.html" >/dev/null
    grep -F "$json_route" "$tmpdir/$origin_name-route-index.json" >/dev/null
    grep -F "automatic_payment_execution" "$tmpdir/$origin_name-preflight.json" >/dev/null
  done

  node "$tmpdir/local-preflight.json" "$tmpdir/public-preflight.json" <<'NODE'
const fs = require("fs");
for (const f of process.argv.slice(1)) {
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  if (j.marker !== "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ENABLEMENT_PREFLIGHT_CLOSEOUT_V1") throw new Error(`${f}: bad marker`);
  for (const [k, v] of Object.entries(j.authority)) {
    if (v !== false) throw new Error(`${f}: authority ${k} must be false`);
  }
  for (const k of [
    "automatic_payment_execution_enabled",
    "automatic_fulfillment_enabled",
    "buyer_fulfillment_enabled",
    "wallet_signing_enabled",
    "treasury_movement_enabled",
    "public_mutation_enabled"
  ]) {
    if (j.status[k] !== false) throw new Error(`${f}: status ${k} must be false`);
  }
}
NODE

  echo "automatic_payment_enablement_preflight_closeout_live_local_route_green=true"
  echo "automatic_payment_enablement_preflight_closeout_live_local_discovery_green=true"
  echo "automatic_payment_enablement_preflight_closeout_live_public_route_green=true"
  echo "automatic_payment_enablement_preflight_closeout_live_public_discovery_green=true"
else
  echo "automatic_payment_enablement_preflight_closeout_live_check_skipped=true"
fi

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ENABLEMENT_PREFLIGHT_CLOSEOUT_V1_GREEN"
