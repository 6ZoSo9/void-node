#!/usr/bin/env bash
set -euo pipefail

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_V1"
terminal_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_TERMINAL_READINESS_ROLLUP_HOLD_V1"

doc="docs/public/usdc-void-buy-pool-automatic-payment-live-path-public-status-card-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-automatic-payment-live-path-public-status-card-v1.json"
src="src/index.ts"

json_route="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1.json"
html_route="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$src"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
grep -Fq "$marker" "$src"

grep -Fq "$terminal_marker" "$doc"
grep -Fq "$terminal_marker" "$fixture"
grep -Fq "$terminal_marker" "$src"

echo "automatic_payment_live_path_public_status_card_doc_green=true"
echo "automatic_payment_live_path_public_status_card_fixture_green=true"
echo "automatic_payment_live_path_public_status_card_src_marker_green=true"

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

assert(j.marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_V1", "bad marker");
assert(j.schema === "usdc_void_buy_pool_automatic_payment_live_path_public_status_card_v1", "bad schema");
assert(j.status === "public_status_read_only_not_enabled", "bad status");
assert(j.visibility === "public", "bad visibility");
assert(j.public_safe === true, "public_safe must be true");
assert(j.private_details_exposed === false, "private details must not be exposed");
assert(j.terminal_private_rollup_marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_TERMINAL_READINESS_ROLLUP_HOLD_V1", "bad terminal marker");

const a = j.automatic_payment_live_path;
assert(a.terminal_readiness_rollup_exists === true, "terminal rollup flag must be true");

for (const k of [
  "activation_enabled",
  "runtime_enabled",
  "automatic_payment_execution",
  "automatic_fulfillment",
  "wallet_fulfillment",
  "signer_access",
  "treasury_transfer_authority",
  "buyer_execution",
  "public_mutation",
  "ledger_write",
  "void_transfer"
]) {
  assert(a[k] === false, `${k} must be false`);
}

for (const [k, v] of Object.entries(j.withheld_values)) {
  assert(v === true, `${k} must be withheld`);
}
NODE

echo "automatic_payment_live_path_public_status_card_json_semantics_green=true"
echo "automatic_payment_live_path_public_status_card_authority_false_green=true"
echo "automatic_payment_live_path_public_status_card_withheld_values_green=true"

grep -Fq "$json_route" "$src"
grep -Fq "$html_route" "$src"
grep -Fq "__void_http_app" "$src"
grep -Fq "__void_usdc_void_buy_pool_automatic_payment_live_path_public_status_card_v1_mounted" "$src"

if grep -Fq 'app.get("/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1' "$src"; then
  echo "automatic_payment_live_path_public_status_card_bad_app_scope_found=false"
  exit 1
fi

echo "automatic_payment_live_path_public_status_card_src_route_green=true"
echo "automatic_payment_live_path_public_status_card_runtime_mount_scope_green=true"

if grep -E "app\.(post|put|patch|delete)\(\"/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1" "$src" >/dev/null 2>&1; then
  echo "automatic_payment_live_path_public_status_card_mutation_route_found=false"
  exit 1
fi

echo "automatic_payment_live_path_public_status_card_read_only_route_green=true"
echo "automatic_payment_live_path_public_status_card_live_check_skipped=true"
echo "${marker}_GREEN"
