#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-loop-first-work-pack-private-operator-award-append-sealed-status-discovery-chain-final-seal-index-patch-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_CHAIN_FINAL_SEAL_INDEX_PATCH_HOLD_V1"
CHAIN_FINAL_SEAL_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_CHAIN_FINAL_SEAL_HOLD_V1"
FINAL_ROLLUP_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_CHAIN_FINAL_ROLLUP_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
FINAL_ROLLUP_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_CHAIN_FINAL_ROLLUP_HOLD_V1"
PRIOR_INDEX_PATCH_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_INDEX_PATCH_HOLD_V1"
PRIVATE_MARKER_PREFIX="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR"

DOC="docs/work-credits/${BRICK}.md"
INDEX_JSON="public/public-node/work-credits/index.json"
PUBLIC_JSON="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-chain-final-seal-index-patch-hold-v1.json"
PUBLIC_HTML="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-chain-final-seal-index-patch-hold-v1.html"

CHAIN_FINAL_SEAL_JSON="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-chain-final-seal-hold-v1.json"
FINAL_ROLLUP_CLOSEOUT_JSON="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-chain-final-rollup-closeout-audit-rollup-hold-v1.json"
FINAL_ROLLUP_JSON="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-chain-final-rollup-hold-v1.json"

echo "== JSON parse / public discovery chain final seal index patch binding =="

for f in "$DOC" "$INDEX_JSON" "$PUBLIC_JSON" "$PUBLIC_HTML" "$CHAIN_FINAL_SEAL_JSON" "$FINAL_ROLLUP_CLOSEOUT_JSON" "$FINAL_ROLLUP_JSON"; do
  test -f "$f" || { echo "missing_file=$f"; exit 1; }
done

node <<NODE
const fs = require("fs");

const marker = "$MARKER";
const brick = "$BRICK";
const chainFinalSealMarker = "$CHAIN_FINAL_SEAL_MARKER";
const finalRollupCloseoutMarker = "$FINAL_ROLLUP_CLOSEOUT_MARKER";
const finalRollupMarker = "$FINAL_ROLLUP_MARKER";
const priorIndexPatchMarker = "$PRIOR_INDEX_PATCH_MARKER";

const record = JSON.parse(fs.readFileSync("$PUBLIC_JSON", "utf8"));
const index = JSON.parse(fs.readFileSync("$INDEX_JSON", "utf8"));
const chainFinalSeal = JSON.parse(fs.readFileSync("$CHAIN_FINAL_SEAL_JSON", "utf8"));
const finalRollupCloseout = JSON.parse(fs.readFileSync("$FINAL_ROLLUP_CLOSEOUT_JSON", "utf8"));
const finalRollup = JSON.parse(fs.readFileSync("$FINAL_ROLLUP_JSON", "utf8"));
const html = fs.readFileSync("$PUBLIC_HTML", "utf8");
const doc = fs.readFileSync("$DOC", "utf8");

function assert(cond, msg) {
  if (!cond) {
    console.error(msg);
    process.exit(1);
  }
}

function findEntry(idx, wantedMarker) {
  if (Array.isArray(idx)) return idx.find(x => x && x.marker === wantedMarker);
  if (idx && typeof idx === "object") {
    const bucket = idx.datanet_wc_public_discovery_index_patches;
    if (Array.isArray(bucket)) return bucket.find(x => x && x.marker === wantedMarker);
  }
  return null;
}

const newEntry = findEntry(index, marker);
const priorEntry = findEntry(index, priorIndexPatchMarker);

assert(record.marker === marker, "record marker mismatch");
assert(record.kind === brick, "record kind mismatch");
assert(record.status === "hold", "record status mismatch");
assert(record.visibility === "public_safe_readonly", "record visibility mismatch");
assert(record.patch_type === "work_credits_public_discovery_chain_final_seal_index_patch", "patch type mismatch");
assert(record.source.private_marker_values === "redacted_not_published", "private marker disclosure mismatch");

assert(record.public_chain.chain_final_seal_marker === chainFinalSealMarker, "chain final seal marker binding mismatch");
assert(record.public_chain.final_rollup_closeout_marker === finalRollupCloseoutMarker, "final rollup closeout marker binding mismatch");
assert(record.public_chain.final_rollup_marker === finalRollupMarker, "final rollup marker binding mismatch");
assert(record.public_chain.prior_index_patch_marker === priorIndexPatchMarker, "prior index patch marker binding mismatch");

assert(record.index_patch.index_json_updated === true, "index json updated mismatch");
assert(record.index_patch.entry_marker === marker, "entry marker mismatch");
assert(record.index_patch.chain_final_seal_bound === true, "chain final seal bound mismatch");
assert(record.index_patch.final_rollup_closeout_bound === true, "final rollup closeout bound mismatch");
assert(record.index_patch.final_rollup_bound === true, "final rollup bound mismatch");
assert(record.index_patch.prior_index_patch_bound === true, "prior index patch bound mismatch");
assert(record.index_patch.wc_policy === "unlimited_uncapped_useful_verifiable_work_accounting", "WC policy mismatch");
assert(record.index_patch.execution_state === "not_executed_by_this_public_index_patch", "execution state mismatch");
assert(record.index_patch.ledger_append_state === "not_appended_by_this_public_index_patch", "ledger append state mismatch");
assert(record.index_patch.public_mutation_state === "not_enabled", "public mutation state mismatch");

assert(chainFinalSeal.marker === chainFinalSealMarker, "chain final seal marker mismatch");
assert(chainFinalSeal.seal_type === "award_append_private_operator_sealed_status_discovery_chain_final_seal", "chain final seal type mismatch");
assert(finalRollupCloseout.marker === finalRollupCloseoutMarker, "final rollup closeout marker mismatch");
assert(finalRollup.marker === finalRollupMarker, "final rollup marker mismatch");

assert(newEntry, "new index entry missing");
assert(newEntry.marker === marker, "new index entry marker mismatch");
assert(newEntry.source_marker === chainFinalSealMarker, "new index source marker mismatch");
assert(newEntry.wc_policy === "unlimited_uncapped_useful_verifiable_work_accounting", "new index WC policy mismatch");

assert(priorEntry, "prior index patch entry missing");

for (const [key, value] of Object.entries(record.boundary)) {
  assert(value === true, "boundary must be true: " + key);
}

assert(doc.includes(marker), "doc marker missing");
assert(html.includes(marker), "html marker missing");
assert(html.includes("no private marker values"), "html redaction note missing");
assert(html.includes("index patch"), "html index patch text missing");

console.log("public_discovery_chain_final_seal_index_patch_binding_green=true");
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
echo "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_CHAIN_FINAL_SEAL_INDEX_PATCH_HOLD_V1_GREEN"
