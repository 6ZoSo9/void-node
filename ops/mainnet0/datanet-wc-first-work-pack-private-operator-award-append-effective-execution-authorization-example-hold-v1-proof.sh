#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-first-work-pack-private-operator-award-append-effective-execution-authorization-example-hold-v1"
MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_EFFECTIVE_EXECUTION_AUTHORIZATION_EXAMPLE_HOLD_V1"

AUTH_CANDIDATE_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_EFFECTIVE_EXECUTION_AUTHORIZATION_CANDIDATE_HOLD_V1"
EFFECTIVE_PREFLIGHT_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_EFFECTIVE_EXECUTION_PREFLIGHT_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
FINAL_EXECUTION_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_FINAL_EXECUTION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
LEDGER_APPEND_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_APPEND_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
LEDGER_LINE_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_LINE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
LEDGER_AUTH_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_WRITE_AUTHORIZATION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
APPROVAL_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_APPROVAL_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
DECISION_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_DECISION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
PREFLIGHT_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_PREFLIGHT_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"

DOC="docs/operator/work-credits/${BRICK}.md"
SCHEMA="schemas/operator/work-credits/${BRICK}.schema.json"
EXAMPLE="examples/operator/work-credits/${BRICK}.example.json"
PRIVATE_RECORD="ops/private/work-credits/${BRICK}.json"

echo "== JSON parse / private effective execution authorization example binding =="

for f in "$DOC" "$SCHEMA" "$EXAMPLE" "$PRIVATE_RECORD"; do
  test -f "$f" || { echo "missing_file=$f"; exit 1; }
done

node <<NODE
const fs = require("fs");

const marker = "$MARKER";
const brick = "$BRICK";
const authCandidate = "$AUTH_CANDIDATE_MARKER";

const schema = JSON.parse(fs.readFileSync("$SCHEMA", "utf8"));
const example = JSON.parse(fs.readFileSync("$EXAMPLE", "utf8"));
const privateRecord = JSON.parse(fs.readFileSync("$PRIVATE_RECORD", "utf8"));
const doc = fs.readFileSync("$DOC", "utf8");

function assert(cond, msg) {
  if (!cond) {
    console.error(msg);
    process.exit(1);
  }
}

for (const obj of [example, privateRecord]) {
  assert(obj.marker === marker, "marker mismatch");
  assert(obj.kind === brick, "kind mismatch");
  assert(obj.status === "hold", "status mismatch");
  assert(obj.visibility === "private_operator_only", "visibility mismatch");
  assert(obj.chain.private_effective_execution_authorization_candidate_marker === authCandidate, "authorization candidate binding mismatch");
  assert(obj.chain.private_effective_execution_preflight_closeout_marker === "$EFFECTIVE_PREFLIGHT_CLOSEOUT_MARKER", "effective preflight closeout binding mismatch");
  assert(obj.chain.private_final_execution_closeout_marker === "$FINAL_EXECUTION_CLOSEOUT_MARKER", "final execution closeout binding mismatch");
  assert(obj.chain.private_ledger_append_closeout_marker === "$LEDGER_APPEND_CLOSEOUT_MARKER", "ledger append closeout binding mismatch");
  assert(obj.chain.private_ledger_line_closeout_marker === "$LEDGER_LINE_CLOSEOUT_MARKER", "ledger line closeout binding mismatch");
  assert(obj.chain.private_ledger_write_authorization_closeout_marker === "$LEDGER_AUTH_CLOSEOUT_MARKER", "ledger write authorization closeout binding mismatch");
  assert(obj.chain.private_award_append_approval_closeout_marker === "$APPROVAL_CLOSEOUT_MARKER", "approval closeout binding mismatch");
  assert(obj.chain.private_award_append_decision_closeout_marker === "$DECISION_CLOSEOUT_MARKER", "decision closeout binding mismatch");
  assert(obj.chain.private_award_append_preflight_closeout_marker === "$PREFLIGHT_CLOSEOUT_MARKER", "preflight closeout binding mismatch");
  assert(obj.authorization_example.authorization_state === "example_not_authorizing_live_execution", "authorization state boundary mismatch");
  assert(obj.authorization_example.execution_state === "not_executed", "execution state mismatch");
  assert(obj.authorization_example.ledger_append_state === "not_appended", "ledger append state mismatch");
  assert(obj.authorization_example.wc_policy === "unlimited_uncapped_useful_verifiable_work_accounting", "WC policy mismatch");
  assert(obj.controls.allows_public_submit === false, "public submit must be false");
  assert(obj.controls.allows_public_mutation === false, "public mutation must be false");
  assert(obj.controls.allows_wallet_signing === false, "wallet signing must be false");
  assert(obj.controls.allows_automatic_reward === false, "automatic reward must be false");
  assert(obj.controls.allows_void_transfer === false, "VOID transfer must be false");
  assert(obj.boundary.no_public_route === true, "public route boundary mismatch");
  assert(obj.boundary.no_public_mutation === true, "public mutation boundary mismatch");
  assert(obj.boundary.no_private_ledger_mutation === true, "private ledger mutation boundary mismatch");
  assert(obj.boundary.no_live_execution_authorization === true, "live execution authorization boundary mismatch");
  assert(obj.boundary.no_ledger_append === true, "ledger append boundary mismatch");
  assert(obj.boundary.no_wc_issuance === true, "WC issuance boundary mismatch");
  assert(obj.boundary.no_wc_settlement === true, "WC settlement boundary mismatch");
  assert(obj.boundary.no_void_transfer === true, "VOID transfer boundary mismatch");
  assert(obj.boundary.no_wallet_or_signer_access === true, "wallet/signer boundary mismatch");
  assert(obj.boundary.no_broadcast === true, "broadcast boundary mismatch");
}

assert(schema.properties.marker.const === marker, "schema marker const mismatch");
assert(doc.includes(marker), "doc marker missing");

console.log("private_operator_effective_execution_authorization_example_binding_green=true");
NODE

echo "== forbidden public mutation scan =="
if git grep -n "$MARKER" -- public >/tmp/void-private-effective-auth-example-public-leak.txt 2>/dev/null; then
  cat /tmp/void-private-effective-auth-example-public-leak.txt
  echo "private_effective_execution_authorization_example_marker_not_in_public_tree_green=false"
  exit 1
fi
rm -f /tmp/void-private-effective-auth-example-public-leak.txt
echo "private_effective_execution_authorization_example_marker_not_in_public_tree_green=true"

echo "== forbidden WC cap wording scan =="
if grep -R -nE "100,000,000 WC|100000000 WC|lifetime WC cap|WC cap" "$DOC" "$SCHEMA" "$EXAMPLE" "$PRIVATE_RECORD"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_EFFECTIVE_EXECUTION_AUTHORIZATION_EXAMPLE_HOLD_V1_GREEN"
