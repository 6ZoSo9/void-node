#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-first-work-pack-private-operator-award-append-sealed-index-final-seal-hold-v1"
MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_INDEX_FINAL_SEAL_HOLD_V1"

SEALED_INDEX_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_INDEX_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
SEALED_INDEX_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_INDEX_HOLD_V1"
PRIVATE_AWARD_APPEND_FINAL_SEAL_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_FINAL_SEAL_HOLD_V1"
CHAIN_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_CHAIN_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
EFFECTIVE_EXECUTION_FINAL_SEAL_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_EFFECTIVE_EXECUTION_FINAL_SEAL_HOLD_V1"
EFFECTIVE_EXECUTION_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_EFFECTIVE_EXECUTION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
EFFECTIVE_AUTH_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_EFFECTIVE_EXECUTION_AUTHORIZATION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
EFFECTIVE_PREFLIGHT_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_EFFECTIVE_EXECUTION_PREFLIGHT_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
FINAL_EXECUTION_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_FINAL_EXECUTION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
LEDGER_APPEND_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_APPEND_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
LEDGER_LINE_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_LINE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
LEDGER_AUTH_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_WRITE_AUTHORIZATION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
APPROVAL_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_APPROVAL_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
DECISION_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_DECISION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
PREFLIGHT_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_PREFLIGHT_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"

DOC="docs/operator/work-credits/${BRICK}.md"
PRIVATE_RECORD="ops/private/work-credits/${BRICK}.json"

echo "== JSON parse / private award append sealed index final seal binding =="

for f in "$DOC" "$PRIVATE_RECORD"; do
  test -f "$f" || { echo "missing_file=$f"; exit 1; }
done

node <<NODE
const fs = require("fs");

const marker = "$MARKER";
const brick = "$BRICK";
const record = JSON.parse(fs.readFileSync("$PRIVATE_RECORD", "utf8"));
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
assert(record.visibility === "private_operator_only", "visibility mismatch");
assert(record.seal_type === "private_operator_award_append_sealed_index_final_seal", "seal type mismatch");

assert(record.chain.private_award_append_sealed_index_closeout_marker === "$SEALED_INDEX_CLOSEOUT_MARKER", "sealed index closeout binding mismatch");
assert(record.chain.private_award_append_sealed_index_marker === "$SEALED_INDEX_MARKER", "sealed index binding mismatch");
assert(record.chain.private_award_append_final_seal_marker === "$PRIVATE_AWARD_APPEND_FINAL_SEAL_MARKER", "private award append final seal binding mismatch");
assert(record.chain.private_award_append_chain_closeout_marker === "$CHAIN_CLOSEOUT_MARKER", "chain closeout binding mismatch");
assert(record.chain.private_effective_execution_final_seal_marker === "$EFFECTIVE_EXECUTION_FINAL_SEAL_MARKER", "effective execution final seal binding mismatch");
assert(record.chain.private_effective_execution_closeout_marker === "$EFFECTIVE_EXECUTION_CLOSEOUT_MARKER", "effective execution closeout binding mismatch");
assert(record.chain.private_effective_execution_authorization_closeout_marker === "$EFFECTIVE_AUTH_CLOSEOUT_MARKER", "effective authorization closeout binding mismatch");
assert(record.chain.private_effective_execution_preflight_closeout_marker === "$EFFECTIVE_PREFLIGHT_CLOSEOUT_MARKER", "effective preflight closeout binding mismatch");
assert(record.chain.private_final_execution_closeout_marker === "$FINAL_EXECUTION_CLOSEOUT_MARKER", "final execution closeout binding mismatch");
assert(record.chain.private_ledger_append_closeout_marker === "$LEDGER_APPEND_CLOSEOUT_MARKER", "ledger append closeout binding mismatch");
assert(record.chain.private_ledger_line_closeout_marker === "$LEDGER_LINE_CLOSEOUT_MARKER", "ledger line closeout binding mismatch");
assert(record.chain.private_ledger_write_authorization_closeout_marker === "$LEDGER_AUTH_CLOSEOUT_MARKER", "ledger write authorization closeout binding mismatch");
assert(record.chain.private_award_append_approval_closeout_marker === "$APPROVAL_CLOSEOUT_MARKER", "approval closeout binding mismatch");
assert(record.chain.private_award_append_decision_closeout_marker === "$DECISION_CLOSEOUT_MARKER", "decision closeout binding mismatch");
assert(record.chain.private_award_append_preflight_closeout_marker === "$PREFLIGHT_CLOSEOUT_MARKER", "preflight closeout binding mismatch");

assert(record.final_seal.sealed_index_closeout_bound === true, "sealed index closeout final seal mismatch");
assert(record.final_seal.sealed_index_bound === true, "sealed index final seal mismatch");
assert(record.final_seal.private_award_append_final_seal_bound === true, "private final seal mismatch");
assert(record.final_seal.private_award_append_chain_closeout_bound === true, "chain closeout final seal mismatch");
assert(record.final_seal.effective_execution_final_seal_bound === true, "effective final seal mismatch");
assert(record.final_seal.seal_state === "sealed_index_final_seal_hold_for_review", "seal state mismatch");
assert(record.final_seal.execution_state === "not_executed", "execution state mismatch");
assert(record.final_seal.ledger_append_state === "not_appended", "ledger append state mismatch");
assert(record.final_seal.wc_policy === "unlimited_uncapped_useful_verifiable_work_accounting", "WC policy mismatch");

for (const [key, value] of Object.entries(record.boundary)) {
  assert(value === true, "boundary must be true: " + key);
}

assert(doc.includes(marker), "doc marker missing");

console.log("private_operator_award_append_sealed_index_final_seal_binding_green=true");
NODE

echo "== forbidden public mutation scan =="
if git grep -n "$MARKER" -- public >/tmp/void-private-award-append-sealed-index-final-seal-public-leak.txt 2>/dev/null; then
  cat /tmp/void-private-award-append-sealed-index-final-seal-public-leak.txt
  echo "private_award_append_sealed_index_final_seal_marker_not_in_public_tree_green=false"
  exit 1
fi
rm -f /tmp/void-private-award-append-sealed-index-final-seal-public-leak.txt
echo "private_award_append_sealed_index_final_seal_marker_not_in_public_tree_green=true"

echo "== forbidden WC cap wording scan =="
if grep -R -nE "100,000,000 WC|100000000 WC|lifetime WC cap|WC cap" "$DOC" "$PRIVATE_RECORD"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_SEALED_INDEX_FINAL_SEAL_HOLD_V1_GREEN"
