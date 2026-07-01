#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-loop-first-work-pack-private-operator-award-append-sealed-status-discovery-index-closeout-audit-rollup-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_INDEX_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
INDEX_PATCH_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_INDEX_PATCH_HOLD_V1"
PRIVATE_MARKER_PREFIX="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR"

DOC="docs/work-credits/${BRICK}.md"
INDEX_JSON="public/public-node/work-credits/index.json"
PUBLIC_JSON="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-index-closeout-audit-rollup-hold-v1.json"
PUBLIC_HTML="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-index-closeout-audit-rollup-hold-v1.html"

PATCH_HTML="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-index-patch-hold-v1.html"
PATCH_JSON="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-index-patch-hold-v1.json"
FINAL_HTML="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-card-final-seal-hold-v1.html"
FINAL_JSON="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-card-final-seal-hold-v1.json"

echo "== JSON parse / public discovery index closeout binding =="

for f in "$DOC" "$INDEX_JSON" "$PUBLIC_JSON" "$PUBLIC_HTML" "$PATCH_HTML" "$PATCH_JSON" "$FINAL_HTML" "$FINAL_JSON"; do
  test -f "$f" || { echo "missing_file=$f"; exit 1; }
done

node <<NODE
const fs = require("fs");

const marker = "$MARKER";
const brick = "$BRICK";
const indexPatchMarker = "$INDEX_PATCH_MARKER";

const record = JSON.parse(fs.readFileSync("$PUBLIC_JSON", "utf8"));
const index = JSON.parse(fs.readFileSync("$INDEX_JSON", "utf8"));
const patch = JSON.parse(fs.readFileSync("$PATCH_JSON", "utf8"));
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
assert(record.closeout_type === "work_credits_public_index_discovery_patch_closeout_audit_rollup", "closeout type mismatch");
assert(record.source.private_marker_values === "redacted_not_published", "private marker disclosure mismatch");

assert(record.public_chain.index_patch_marker === indexPatchMarker, "index patch marker binding mismatch");
assert(record.closeout.index_patch_bound === true, "index patch closeout binding mismatch");
assert(record.closeout.index_json_bound === true, "index json closeout binding mismatch");
assert(record.closeout.discovery_final_seal_bound === true, "discovery final seal closeout binding mismatch");
assert(record.closeout.wc_policy === "unlimited_uncapped_useful_verifiable_work_accounting", "WC policy mismatch");
assert(record.closeout.execution_state === "not_executed_by_this_public_index_closeout", "execution state mismatch");
assert(record.closeout.ledger_append_state === "not_appended_by_this_public_index_closeout", "ledger append state mismatch");
assert(record.closeout.public_mutation_state === "not_enabled", "public mutation state mismatch");

assert(patch.marker === indexPatchMarker, "patch record marker mismatch");
assert(patch.patch_type === "work_credits_public_index_discovery_patch", "patch type mismatch");

assert(entry, "index patch entry missing from public index");
assert(entry.marker === indexPatchMarker, "index entry marker mismatch");
assert(entry.wc_policy === "unlimited_uncapped_useful_verifiable_work_accounting", "index WC policy mismatch");

for (const [key, value] of Object.entries(record.boundary)) {
  assert(value === true, "boundary must be true: " + key);
}

assert(doc.includes(marker), "doc marker missing");
assert(html.includes(marker), "html marker missing");
assert(html.includes("no private marker values"), "html redaction note missing");

console.log("public_discovery_index_closeout_binding_green=true");
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
echo "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_INDEX_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN"
