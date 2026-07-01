#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-loop-first-work-pack-private-operator-award-append-sealed-status-discovery-index-patch-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_INDEX_PATCH_HOLD_V1"
DISCOVERY_FINAL_SEAL_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_CARD_FINAL_SEAL_HOLD_V1"
PRIVATE_MARKER_PREFIX="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR"

DOC="docs/work-credits/${BRICK}.md"
INDEX_JSON="public/public-node/work-credits/index.json"
INDEX_HTML="public/public-node/work-credits/index.html"
PUBLIC_JSON="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-index-patch-hold-v1.json"
PUBLIC_HTML="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-index-patch-hold-v1.html"

FINAL_HTML="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-card-final-seal-hold-v1.html"
FINAL_JSON="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-card-final-seal-hold-v1.json"

echo "== JSON parse / public discovery index patch binding =="

for f in "$DOC" "$INDEX_JSON" "$PUBLIC_JSON" "$PUBLIC_HTML" "$FINAL_HTML" "$FINAL_JSON"; do
  test -f "$f" || { echo "missing_file=$f"; exit 1; }
done

node <<NODE
const fs = require("fs");

const marker = "$MARKER";
const brick = "$BRICK";
const record = JSON.parse(fs.readFileSync("$PUBLIC_JSON", "utf8"));
const index = JSON.parse(fs.readFileSync("$INDEX_JSON", "utf8"));
const html = fs.readFileSync("$PUBLIC_HTML", "utf8");
const doc = fs.readFileSync("$DOC", "utf8");

function assert(cond, msg) {
  if (!cond) {
    console.error(msg);
    process.exit(1);
  }
}

function findEntry(idx) {
  if (Array.isArray(idx)) return idx.find(x => x && x.marker === marker);
  if (idx && typeof idx === "object") {
    const bucket = idx.datanet_wc_public_discovery_index_patches;
    if (Array.isArray(bucket)) return bucket.find(x => x && x.marker === marker);
  }
  return null;
}

const entry = findEntry(index);

assert(record.marker === marker, "record marker mismatch");
assert(record.kind === brick, "record kind mismatch");
assert(record.status === "hold", "record status mismatch");
assert(record.visibility === "public_safe_readonly", "record visibility mismatch");
assert(record.patch_type === "work_credits_public_index_discovery_patch", "patch type mismatch");
assert(record.source.private_marker_values === "redacted_not_published", "private marker disclosure mismatch");
assert(record.index_entry.marker === marker, "record entry marker mismatch");
assert(record.index_entry.chain.discovery_final_seal_marker === "$DISCOVERY_FINAL_SEAL_MARKER", "discovery final seal binding mismatch");

assert(entry, "index entry missing");
assert(entry.marker === marker, "index marker mismatch");
assert(entry.visibility === "public_safe_readonly", "index visibility mismatch");
assert(entry.wc_policy === "unlimited_uncapped_useful_verifiable_work_accounting", "index WC policy mismatch");
assert(entry.chain.discovery_final_seal_marker === "$DISCOVERY_FINAL_SEAL_MARKER", "index discovery final seal binding mismatch");

for (const [key, value] of Object.entries(record.index_entry.boundary)) {
  assert(value === true, "record boundary must be true: " + key);
}
for (const [key, value] of Object.entries(entry.boundary)) {
  assert(value === true, "index boundary must be true: " + key);
}

assert(doc.includes(marker), "doc marker missing");
assert(html.includes(marker), "html marker missing");
assert(html.includes("no private marker values"), "html redaction note missing");

console.log("public_discovery_index_patch_binding_green=true");
NODE

if test -f "$INDEX_HTML"; then
  grep -F "DataNet WC award append sealed status discovery" "$INDEX_HTML" >/dev/null
  grep -F "datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-index-patch-hold-v1.html" "$INDEX_HTML" >/dev/null
  echo "index_html_patch_green=true"
else
  echo "index_html_absent_skip_green=true"
fi

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
echo "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_INDEX_PATCH_HOLD_V1_GREEN"
