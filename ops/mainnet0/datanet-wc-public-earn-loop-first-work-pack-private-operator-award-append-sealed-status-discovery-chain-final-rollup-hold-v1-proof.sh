#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-loop-first-work-pack-private-operator-award-append-sealed-status-discovery-chain-final-rollup-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_CHAIN_FINAL_ROLLUP_HOLD_V1"
INDEX_FINAL_SEAL_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_INDEX_FINAL_SEAL_HOLD_V1"
INDEX_PATCH_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_INDEX_PATCH_HOLD_V1"
PRIVATE_MARKER_PREFIX="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR"

DOC="docs/work-credits/${BRICK}.md"
INDEX_JSON="public/public-node/work-credits/index.json"
PUBLIC_JSON="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-chain-final-rollup-hold-v1.json"
PUBLIC_HTML="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-chain-final-rollup-hold-v1.html"

INDEX_FINAL_HTML="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-index-final-seal-hold-v1.html"
INDEX_FINAL_JSON="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-index-final-seal-hold-v1.json"
INDEX_PATCH_HTML="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-index-patch-hold-v1.html"
INDEX_PATCH_JSON="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-index-patch-hold-v1.json"

echo "== JSON parse / public discovery chain final rollup binding =="

for f in "$DOC" "$INDEX_JSON" "$PUBLIC_JSON" "$PUBLIC_HTML" "$INDEX_FINAL_HTML" "$INDEX_FINAL_JSON" "$INDEX_PATCH_HTML" "$INDEX_PATCH_JSON"; do
  test -f "$f" || { echo "missing_file=$f"; exit 1; }
done

node <<NODE
const fs = require("fs");

const marker = "$MARKER";
const brick = "$BRICK";
const indexFinalSealMarker = "$INDEX_FINAL_SEAL_MARKER";
const indexPatchMarker = "$INDEX_PATCH_MARKER";

const record = JSON.parse(fs.readFileSync("$PUBLIC_JSON", "utf8"));
const index = JSON.parse(fs.readFileSync("$INDEX_JSON", "utf8"));
const indexFinal = JSON.parse(fs.readFileSync("$INDEX_FINAL_JSON", "utf8"));
const indexPatch = JSON.parse(fs.readFileSync("$INDEX_PATCH_JSON", "utf8"));
const html = fs.readFileSync("$PUBLIC_HTML", "utf8");
const doc = fs.readFileSync("$DOC", "utf8");

function assert(cond, msg) {
  if (!cond) {
    console.error(msg);
    process.exit(1);
  }
}

function findEntry(idx) {
  if (Array.isArray(idx)) return idx.find(x => x && x.marker === indexPatchMarker);
  if (idx && typeof idx === "object") {
    const bucket = idx.datanet_wc_public_discovery_index_patches;
    if (Array.isArray(bucket)) return bucket.find(x => x && x.marker === indexPatchMarker);
  }
  return null;
}

const entry = findEntry(index);

assert(record.marker === marker, "record marker mismatch");
assert(record.kind === brick, "record kind mismatch");
assert(record.status === "hold", "record status mismatch");
assert(record.visibility === "public_safe_readonly", "record visibility mismatch");
assert(record.rollup_type === "award_append_private_operator_sealed_status_discovery_chain_final_rollup", "rollup type mismatch");
assert(record.source.private_marker_values === "redacted_not_published", "private marker disclosure mismatch");

assert(record.public_chain.index_final_seal_marker === indexFinalSealMarker, "index final seal marker binding mismatch");
assert(record.public_chain.index_patch_marker === indexPatchMarker, "index patch marker binding mismatch");
assert(record.final_rollup.index_final_seal_bound === true, "index final seal final rollup binding mismatch");
assert(record.final_rollup.index_patch_bound === true, "index patch final rollup binding mismatch");
assert(record.final_rollup.index_json_bound === true, "index json final rollup binding mismatch");
assert(record.final_rollup.sealed_status_rollup_bound === true, "sealed status rollup binding mismatch");
assert(record.final_rollup.wc_policy === "unlimited_uncapped_useful_verifiable_work_accounting", "WC policy mismatch");
assert(record.final_rollup.execution_state === "not_executed_by_this_public_final_rollup", "execution state mismatch");
assert(record.final_rollup.ledger_append_state === "not_appended_by_this_public_final_rollup", "ledger append state mismatch");
assert(record.final_rollup.public_mutation_state === "not_enabled", "public mutation state mismatch");

assert(indexFinal.marker === indexFinalSealMarker, "index final seal marker mismatch");
assert(indexFinal.seal_type === "work_credits_public_index_discovery_final_seal", "index final seal type mismatch");
assert(indexPatch.marker === indexPatchMarker, "index patch marker mismatch");
assert(indexPatch.patch_type === "work_credits_public_index_discovery_patch", "index patch type mismatch");

assert(entry, "index patch entry missing from public index");
assert(entry.marker === indexPatchMarker, "index entry marker mismatch");
assert(entry.wc_policy === "unlimited_uncapped_useful_verifiable_work_accounting", "index WC policy mismatch");

for (const [key, value] of Object.entries(record.boundary)) {
  assert(value === true, "boundary must be true: " + key);
}

assert(doc.includes(marker), "doc marker missing");
assert(html.includes(marker), "html marker missing");
assert(html.includes("no private marker values"), "html redaction note missing");
assert(html.includes("final rollup"), "html final rollup text missing");

console.log("public_discovery_chain_final_rollup_binding_green=true");
NODE

echo "== private marker leak scan in public tree =="
if git grep -n "$PRIVATE_MARKER_PREFIX" -- public >/tmp/void-public-private-marker-leak.txt 2>/dev/null; then
  cat /tmp/void-public-private-marker-leak.txt
  echo "private_marker_values_not_in_public_tree_green=false"
  exit 1
fi
rm -f /tmp/void-public-private-marker-leak.txt
echo "private_marker_values_not_in_public_tree_green=true"

echo "== static read-only public surface scan =="
if grep -R -nE "<form|method=['\"]?post|fetch\\(|XMLHttpRequest|walletConnect|signTransaction|sendTransaction|eth_sendTransaction" "$PUBLIC_JSON" "$PUBLIC_HTML"; then
  echo "public_static_readonly_scan_green=false"
  exit 1
fi
echo "public_static_readonly_scan_green=true"

echo "== forbidden WC cap wording scan =="
if grep -R -nE "100,000,000 WC|100000000 WC|lifetime WC cap|WC cap" "$DOC" "$PUBLIC_JSON" "$PUBLIC_HTML"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_CHAIN_FINAL_ROLLUP_HOLD_V1_GREEN"
