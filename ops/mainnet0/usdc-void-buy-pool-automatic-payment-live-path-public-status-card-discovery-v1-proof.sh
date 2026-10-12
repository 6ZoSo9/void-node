#!/usr/bin/env bash
set -euo pipefail

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_DISCOVERY_V1"
status_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_V1"
terminal_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_TERMINAL_READINESS_ROLLUP_HOLD_V1"

doc="docs/public/usdc-void-buy-pool-automatic-payment-live-path-public-status-card-discovery-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-automatic-payment-live-path-public-status-card-discovery-v1.json"
src="src/index.ts"

json_route="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-discovery-v1.json"
html_route="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-discovery-v1"
status_json_route="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1.json"
status_html_route="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$src"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
grep -Fq "$marker" "$src"

grep -Fq "$status_marker" "$doc"
grep -Fq "$status_marker" "$fixture"
grep -Fq "$status_marker" "$src"

grep -Fq "$terminal_marker" "$doc"
grep -Fq "$terminal_marker" "$fixture"
grep -Fq "$terminal_marker" "$src"

echo "automatic_payment_live_path_public_status_card_discovery_doc_green=true"
echo "automatic_payment_live_path_public_status_card_discovery_fixture_green=true"
echo "automatic_payment_live_path_public_status_card_discovery_src_marker_green=true"

node - "$fixture" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
const j = JSON.parse(fs.readFileSync(file, "utf8"));

function assert(cond, msg) {
  if (!cond) {
    console.error(msg);
    process.exit(1);
  }
}

assert(j.marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_DISCOVERY_V1", "bad marker");
assert(j.schema === "usdc_void_buy_pool_automatic_payment_live_path_public_status_card_discovery_v1", "bad schema");
assert(j.status === "public_discovery_read_only", "bad status");
assert(j.visibility === "public", "bad visibility");
assert(j.public_safe === true, "public_safe must be true");
assert(j.private_details_exposed === false, "private details must not be exposed");
assert(j.linked_status_marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_V1", "bad status marker");
assert(j.linked_private_terminal_marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_TERMINAL_READINESS_ROLLUP_HOLD_V1", "bad terminal marker");

for (const k of [
  "status_card_json",
  "status_card_html",
  "discovery_json",
  "discovery_html",
  "route_index_json"
]) {
  assert(typeof j.routes[k] === "string" && j.routes[k].startsWith("/public-node/"), `bad route ${k}`);
}

for (const [k, v] of Object.entries(j.authority)) {
  assert(v === false, `authority ${k} must be false`);
}
NODE

echo "automatic_payment_live_path_public_status_card_discovery_json_semantics_green=true"
echo "automatic_payment_live_path_public_status_card_discovery_authority_false_green=true"

grep -Fq "$json_route" "$doc"
grep -Fq "$html_route" "$doc"
grep -Fq "$status_json_route" "$doc"
grep -Fq "$status_html_route" "$doc"

grep -Fq "$json_route" "$fixture"
grep -Fq "$html_route" "$fixture"
grep -Fq "$status_json_route" "$fixture"
grep -Fq "$status_html_route" "$fixture"
grep -Fq "/public-node/route-index.json" "$fixture"

grep -Fq "$json_route" "$src"
grep -Fq "$html_route" "$src"
grep -Fq "$status_json_route" "$src"
grep -Fq "$status_html_route" "$src"
grep -Fq "__void_http_app" "$src"
grep -Fq "__void_usdc_void_buy_pool_automatic_payment_live_path_public_status_card_discovery_v1_mounted" "$src"

echo "automatic_payment_live_path_public_status_card_discovery_links_green=true"
echo "automatic_payment_live_path_public_status_card_discovery_runtime_mount_scope_green=true"

route_index_wiring_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_DISCOVERY_ROUTE_INDEX_WIRING_V1"

grep -Fq "$route_index_wiring_marker" "$src"
grep -Fq "route_index_wiring_marker" "$src"

if grep -Fq '\\n      { path: "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1"' "$src"; then
  echo "automatic_payment_live_path_public_status_card_discovery_route_index_wiring_escaped_newline_absent=false"
  exit 1
fi

echo "automatic_payment_live_path_public_status_card_discovery_route_index_wiring_escaped_newline_absent=true"
grep -Fq "automatic payment live-path status card HTML route-index entry" "$src"
grep -Fq "automatic payment live-path status card JSON route-index entry" "$src"
grep -Fq "automatic payment live-path discovery HTML route-index entry" "$src"
grep -Fq "automatic payment live-path discovery JSON route-index entry" "$src"

echo "automatic_payment_live_path_public_status_card_discovery_route_index_wiring_green=true"

if grep -Fq 'app.get("/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-discovery-v1' "$src"; then
  echo "automatic_payment_live_path_public_status_card_discovery_bad_app_scope_found=false"
  exit 1
fi

if grep -E "app\.(post|put|patch|delete)\(\"/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-discovery-v1" "$src" >/dev/null 2>&1; then
  echo "automatic_payment_live_path_public_status_card_discovery_mutation_route_found=false"
  exit 1
fi

echo "automatic_payment_live_path_public_status_card_discovery_read_only_route_green=true"
echo "automatic_payment_live_path_public_status_card_discovery_live_check_skipped=true"
echo "${marker}_GREEN"
