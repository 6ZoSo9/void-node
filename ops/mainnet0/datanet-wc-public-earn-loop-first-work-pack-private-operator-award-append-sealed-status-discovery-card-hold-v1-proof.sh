#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-loop-first-work-pack-private-operator-award-append-sealed-status-discovery-card-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_CARD_HOLD_V1"
SEALED_STATUS_FINAL_SEAL_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_FINAL_SEAL_HOLD_V1"
SEALED_STATUS_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
SEALED_STATUS_ROLLUP_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_ROLLUP_HOLD_V1"
PRIVATE_MARKER_PREFIX="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR"

DOC="docs/work-credits/${BRICK}.md"
PUBLIC_JSON="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-card-hold-v1.json"
PUBLIC_HTML="public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-discovery-card-hold-v1.html"

echo "== JSON parse / public award append sealed status discovery card binding =="

for f in "$DOC" "$PUBLIC_JSON" "$PUBLIC_HTML"; do
  test -f "$f" || { echo "missing_file=$f"; exit 1; }
done

for linked in \
  public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-rollup-hold-v1.html \
  public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-rollup-hold-v1.json \
  public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-closeout-audit-rollup-hold-v1.html \
  public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-closeout-audit-rollup-hold-v1.json \
  public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-final-seal-hold-v1.html \
  public/public-node/work-credits/datanet-wc-first-work-pack-private-operator-award-append-sealed-status-final-seal-hold-v1.json
do
  test -f "$linked" || { echo "missing_linked_public_surface=$linked"; exit 1; }
done

node <<NODE
const fs = require("fs");

const marker = "$MARKER";
const brick = "$BRICK";
const record = JSON.parse(fs.readFileSync("$PUBLIC_JSON", "utf8"));
const html = fs.readFileSync("$PUBLIC_HTML", "utf8");
const doc = fs.readFileSync("$DOC", "utf8");

function assert(cond, msg) {
  if (!cond) {
    console.error(msg);
    process.exit(1);
  }
}

assert(record.marker === marker, "marker mismatch");
assert(record.kind === brick, "kind mismatch");
assert(record.status === "hold", "status mismatch");
assert(record.visibility === "public_safe_readonly", "visibility mismatch");
assert(record.card_type === "award_append_private_operator_sealed_status_discovery", "card type mismatch");

assert(record.source.private_marker_values === "redacted_not_published", "private marker disclosure mismatch");
assert(record.public_chain.sealed_status_rollup_marker === "$SEALED_STATUS_ROLLUP_MARKER", "sealed status rollup binding mismatch");
assert(record.public_chain.sealed_status_closeout_marker === "$SEALED_STATUS_CLOSEOUT_MARKER", "sealed status closeout binding mismatch");
assert(record.public_chain.sealed_status_final_seal_marker === "$SEALED_STATUS_FINAL_SEAL_MARKER", "sealed status final seal binding mismatch");
assert(record.discovery.sealed_status_final_seal_bound === true, "final seal discovery binding mismatch");
assert(record.discovery.sealed_status_closeout_bound === true, "closeout discovery binding mismatch");
assert(record.discovery.sealed_status_rollup_bound === true, "rollup discovery binding mismatch");
assert(record.discovery.operator_side_award_append_chain === "sealed_for_review", "operator chain status mismatch");
assert(record.discovery.public_disclosure_level === "public_safe_no_private_markers", "disclosure level mismatch");
assert(record.discovery.discovery_state === "public_discovery_card_hold", "discovery state mismatch");
assert(record.discovery.execution_state === "not_executed_by_this_public_discovery_card", "execution state mismatch");
assert(record.discovery.ledger_append_state === "not_appended_by_this_public_discovery_card", "ledger append state mismatch");
assert(record.discovery.public_mutation_state === "not_enabled", "public mutation state mismatch");
assert(record.discovery.wc_policy === "unlimited_uncapped_useful_verifiable_work_accounting", "WC policy mismatch");

for (const [key, value] of Object.entries(record.boundary)) {
  assert(value === true, "boundary must be true: " + key);
}

assert(doc.includes(marker), "doc marker missing");
assert(html.includes(marker), "html marker missing");
assert(html.includes("no private marker values"), "html redaction note missing");
assert(html.includes("sealed status final seal"), "html final seal link text missing");

console.log("public_award_append_sealed_status_discovery_card_binding_green=true");
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
echo "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_STATUS_DISCOVERY_CARD_HOLD_V1_GREEN"
