#!/usr/bin/env bash
set -euo pipefail

BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-source-hash-chain-fixture-proof}"
mkdir -p "$OUT"

ROUTE_JSON="$OUT/source-hash-chain-fixture.json"
PUBLIC_NODE_HTML="$OUT/public-node.html"
ROUTE_MANIFEST_JSON="$OUT/route-manifest.json"
SELF_CHECK_JSON="$OUT/self-check.json"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_FIXTURE_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_FIXTURE_DOC_V1" \
  docs/public/public-node-first-external-tester-wc-source-hash-chain-fixture.md

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_FIXTURE_UI_V1" src/index.ts
grep -Fq "/public-node/first-external-tester-wc-source-hash-chain-fixture.json" src/index.ts

curl -fsS "$BASE/public-node/first-external-tester-wc-source-hash-chain-fixture.json" -o "$ROUTE_JSON"
curl -fsS "$BASE/public-node" -o "$PUBLIC_NODE_HTML"
curl -fsS "$BASE/public-node/route-manifest.json" -o "$ROUTE_MANIFEST_JSON"
curl -fsS "$BASE/public-node/self-check-snapshot.json" -o "$SELF_CHECK_JSON"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_FIXTURE_UI_V1" "$PUBLIC_NODE_HTML"

node - "$ROUTE_JSON" "$ROUTE_MANIFEST_JSON" "$SELF_CHECK_JSON" <<'NODE'
const fs = require("fs");
const [routePath, manifestPath, selfCheckPath] = process.argv.slice(2);
const route = JSON.parse(fs.readFileSync(routePath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const selfCheck = JSON.parse(fs.readFileSync(selfCheckPath, "utf8"));

function assert(cond, msg) {
  if (!cond) {
    console.error(msg);
    process.exit(1);
  }
}

assert(route.marker === "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_FIXTURE_V1", "bad route marker");
assert(route.route_marker === "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_FIXTURE_ROUTE_V1", "bad route marker field");
assert(route.fixture_only === true, "fixture_only not true");
assert(route.preview_only === true, "preview_only not true");
assert(route.fixture_preview_green === true, "fixture_preview_green not true");
assert(route.hash_algorithm === "sha256", "hash algorithm not sha256");
assert(Array.isArray(route.hash_chain_preview), "missing hash_chain_preview");
assert(route.hash_chain_preview.length === 4, "preview chain length not 4");
assert(route.required_chain_length === 8, "required chain length not 8");
assert(route.preview_chain_length === 4, "preview chain length field not 4");

for (let i = 0; i < route.hash_chain_preview.length; i++) {
  const item = route.hash_chain_preview[i];
  assert(item.order === i + 1, "bad chain order");
  assert(typeof item.stage === "string" && item.stage.length > 0, "missing stage");
  assert(/^[a-f0-9]{64}$/.test(item.source_hash), "bad source hash");
  assert(/^[a-f0-9]{64}$/.test(item.link_hash), "bad link hash");
  if (i === 0) {
    assert(item.previous_source_hash === null, "first previous hash must be null");
  } else {
    assert(item.previous_source_hash === route.hash_chain_preview[i - 1].source_hash, "previous hash mismatch");
  }
}

assert(route.source_hash_chain_green === false, "source_hash_chain_green must stay false");
assert(route.source_hash_chain_promoted_to_approved === false, "source hash chain promoted unexpectedly");
assert(route.ready_for_ledger_write === false, "ready_for_ledger_write must stay false");
assert(route.wc_ledger_write === false, "wc_ledger_write must stay false");
assert(route.wc_credit_award === false, "wc_credit_award must stay false");
assert(route.wc_to_void_swap === false, "wc_to_void_swap must stay false");
assert(route.no_mutation && route.no_mutation.money_movement === false, "money movement must stay false");
assert(route.no_mutation.wallet_send === false, "wallet send must stay false");

const routePathValue = "/public-node/first-external-tester-wc-source-hash-chain-fixture.json";
assert(JSON.stringify(manifest).includes(routePathValue), "route manifest missing fixture route");
assert(JSON.stringify(selfCheck).includes(routePathValue), "self-check missing fixture route");
NODE

echo "source_hash_chain_fixture_green=true"
echo "source_hash_chain_fixture_only=true"
echo "source_hash_chain_fixture_preview_only=true"
echo "source_hash_chain_fixture_preview_length=4"
echo "source_hash_chain_fixture_required_length=8"
echo "source_hash_chain_green=false"
echo "ready_for_ledger_write=false"
echo "wc_ledger_write=false"
echo "wc_credit_award=false"
echo "wc_to_void_swap=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_FIXTURE_PROOF_V1_GREEN"
