#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-first-work-pack-private-operator-award-append-effective-execution-authorization-closeout-audit-rollup-hold-v1"
MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_EFFECTIVE_EXECUTION_AUTHORIZATION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"

AUTH_CANDIDATE_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_EFFECTIVE_EXECUTION_AUTHORIZATION_CANDIDATE_HOLD_V1"
AUTH_EXAMPLE_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_EFFECTIVE_EXECUTION_AUTHORIZATION_EXAMPLE_HOLD_V1"
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

echo "== JSON parse / private effective execution authorization closeout binding =="

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
assert(record.closeout_type === "effective_execution_authorization_closeout_audit_rollup", "closeout type mismatch");

assert(record.chain.private_effective_execution_authorization_candidate_marker === "$AUTH_CANDIDATE_MARKER", "authorization candidate binding mismatch");
assert(record.chain.private_effective_execution_authorization_example_marker === "$AUTH_EXAMPLE_MARKER", "authorization example binding mismatch");
assert(record.chain.private_effective_execution_preflight_closeout_marker === "$EFFECTIVE_PREFLIGHT_CLOSEOUT_MARKER", "effective preflight closeout binding mismatch");
assert(record.chain.private_final_execution_closeout_marker === "$FINAL_EXECUTION_CLOSEOUT_MARKER", "final execution closeout binding mismatch");
assert(record.chain.private_ledger_append_closeout_marker === "$LEDGER_APPEND_CLOSEOUT_MARKER", "ledger append closeout binding mismatch");
assert(record.chain.private_ledger_line_closeout_marker === "$LEDGER_LINE_CLOSEOUT_MARKER", "ledger line closeout binding mismatch");
assert(record.chain.private_ledger_write_authorization_closeout_marker === "$LEDGER_AUTH_CLOSEOUT_MARKER", "ledger write authorization closeout binding mismatch");
assert(record.chain.private_award_append_approval_closeout_marker === "$APPROVAL_CLOSEOUT_MARKER", "approval closeout binding mismatch");
assert(record.chain.private_award_append_decision_closeout_marker === "$DECISION_CLOSEOUT_MARKER", "decision closeout binding mismatch");
assert(record.chain.private_award_append_preflight_closeout_marker === "$PREFLIGHT_CLOSEOUT_MARKER", "preflight closeout binding mismatch");

assert(record.closeout.candidate_bound === true, "candidate closeout binding mismatch");
assert(record.closeout.example_bound === true, "example closeout binding mismatch");
assert(record.closeout.authorization_state === "not_live_execution_authorization", "authorization state boundary mismatch");
assert(record.closeout.execution_state === "not_executed", "execution state mismatch");
assert(record.closeout.ledger_append_state === "not_appended", "ledger append state mismatch");
assert(record.closeout.wc_policy === "unlimited_uncapped_useful_verifiable_work_accounting", "WC policy mismatch");

for (const [key, value] of Object.entries(record.boundary)) {
  assert(value === true, "boundary must be true: " + key);
}

assert(doc.includes(marker), "doc marker missing");

console.log("private_operator_effective_execution_authorization_closeout_binding_green=true");
NODE

echo "== forbidden public mutation scan =="
if git grep -n "$MARKER" -- public >/tmp/void-private-effective-auth-closeout-public-leak.txt 2>/dev/null; then
  cat /tmp/void-private-effective-auth-closeout-public-leak.txt
  echo "private_effective_execution_authorization_closeout_marker_not_in_public_tree_green=false"
  exit 1
fi
rm -f /tmp/void-private-effective-auth-closeout-public-leak.txt
echo "private_effective_execution_authorization_closeout_marker_not_in_public_tree_green=true"

echo "== forbidden WC cap wording scan =="
if grep -R -nE "100,000,000 WC|100000000 WC|lifetime WC cap|WC cap" "$DOC" "$PRIVATE_RECORD"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_EFFECTIVE_EXECUTION_AUTHORIZATION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN"
