#!/usr/bin/env bash
set -euo pipefail

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_V1"
doc="docs/public/usdc-void-buy-pool-automatic-payment-live-path-public-reviewer-verify-pack-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-automatic-payment-live-path-public-reviewer-verify-pack-v1.json"
src="src/index.ts"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$src"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
grep -Fq "$marker" "$src"

echo "automatic_payment_live_path_public_reviewer_verify_pack_doc_green=true"
echo "automatic_payment_live_path_public_reviewer_verify_pack_fixture_green=true"
echo "automatic_payment_live_path_public_reviewer_verify_pack_src_marker_green=true"

node - "$fixture" <<'NODE'
const fs = require("fs");
const j = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
function assert(cond, msg) { if (!cond) { console.error(msg); process.exit(1); } }

assert(j.marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_V1", "bad marker");
assert(j.status === "public_reviewer_verify_pack_read_only", "bad status");
assert(j.visibility === "public", "bad visibility");
assert(j.public_safe === true, "public_safe must be true");
assert(j.private_details_exposed === false, "private_details_exposed must be false");

for (const [k, v] of Object.entries(j.authority)) assert(v === false, authority ${k} must be false);

for (const route of [
"/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json",
"/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1",
"/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1.json",
"/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-discovery-v1.json",
"/public-node/route-index.json"
]) assert(JSON.stringify(j).includes(route), missing route ${route});

assert(j.copy_paste_verify_command.includes("VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_V1_REVIEWER_GREEN"), "copy command missing reviewer green marker");
NODE

echo "automatic_payment_live_path_public_reviewer_verify_pack_json_semantics_green=true"
echo "automatic_payment_live_path_public_reviewer_verify_pack_authority_false_green=true"
echo "automatic_payment_live_path_public_reviewer_verify_pack_copy_command_green=true"

grep -Fq "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json" "$src"
grep -Fq "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1" "$src"
grep -Fq "automatic payment live-path public reviewer verify pack JSON route-index entry" "$src"
grep -Fq "automatic payment live-path public reviewer verify pack HTML route-index entry" "$src"

echo "automatic_payment_live_path_public_reviewer_verify_pack_route_index_wiring_green=true"
echo "automatic_payment_live_path_public_reviewer_verify_pack_read_only_route_green=true"

if [ "${VOID_LIVE_CHECK:-0}" = "1" ]; then
base="${VOID_PUBLIC_BASE:-http://127.0.0.1:4100}"
tmp="$(mktemp -d)"
curl -fsS "$base/public-node/route-index.json" > "$tmp/route-index.json"
curl -fsS "$base/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json" > "$tmp/pack.json"
curl -fsS "$base/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1" > "$tmp/pack.html"
grep -Fq "$marker" "$tmp/pack.json"
grep -Fq "$marker" "$tmp/pack.html"
grep -Fq "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json" "$tmp/route-index.json"
echo "automatic_payment_live_path_public_reviewer_verify_pack_live_check_green=true"
else
echo "automatic_payment_live_path_public_reviewer_verify_pack_live_check_skipped=true"
fi

echo "${marker}_GREEN"
