#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-first-work-pack-private-operator-ledger-write-authorization-closeout-audit-rollup-hold-v1"
MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_WRITE_AUTHORIZATION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"

LEDGER_AUTH_CANDIDATE_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_WRITE_AUTHORIZATION_CANDIDATE_HOLD_V1"
LEDGER_AUTH_EXAMPLE_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_WRITE_AUTHORIZATION_EXAMPLE_HOLD_V1"
APPROVAL_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_APPROVAL_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
APPROVAL_CANDIDATE_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_APPROVAL_CANDIDATE_HOLD_V1"
APPROVAL_EXAMPLE_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_APPROVAL_EXAMPLE_HOLD_V1"
DECISION_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_DECISION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
PREFLIGHT_CLOSEOUT_MARKER="VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_AWARD_APPEND_PREFLIGHT_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
PUBLIC_STATUS_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AWARD_PUBLIC_STATUS_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
PUBLIC_LEDGER_APPROVAL_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_APPROVAL_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
PUBLIC_LEDGER_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_LEDGER_WRITE_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
AMOUNT_CLOSEOUT_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_WC_AMOUNT_RECOMMENDATION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
FIRST_PACK_MARKER="VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1"

DOC="docs/operator/work-credits/${BRICK}.md"
PRIVATE_RECORD="ops/private/work-credits/${BRICK}.json"
WC_INDEX="public/public-node/work-credits/index.json"
ROOT_INDEX="public/public-node/index.json"

echo "== JSON parse / private authorization closeout binding =="
python3 - <<PY
import json
from pathlib import Path

def need(condition, message):
    if not condition:
        raise AssertionError(message)

marker = "$MARKER"
required_markers = [
    "$LEDGER_AUTH_CANDIDATE_MARKER",
    "$LEDGER_AUTH_EXAMPLE_MARKER",
    "$APPROVAL_CLOSEOUT_MARKER",
    "$APPROVAL_CANDIDATE_MARKER",
    "$APPROVAL_EXAMPLE_MARKER",
    "$DECISION_CLOSEOUT_MARKER",
    "$PREFLIGHT_CLOSEOUT_MARKER",
    "$PUBLIC_STATUS_CLOSEOUT_MARKER",
    "$PUBLIC_LEDGER_APPROVAL_CLOSEOUT_MARKER",
    "$PUBLIC_LEDGER_CLOSEOUT_MARKER",
    "$AMOUNT_CLOSEOUT_MARKER",
    "$FIRST_PACK_MARKER"
]

record = json.loads(Path("$PRIVATE_RECORD").read_text())
doc = Path("$DOC").read_text()
wc_index = json.loads(Path("$WC_INDEX").read_text())
root_index = json.loads(Path("$ROOT_INDEX").read_text())
blob = json.dumps(record, sort_keys=True)

need(record["marker"] == marker, "record marker mismatch")
need(marker in doc, "marker missing from doc")

for source_marker in required_markers:
    need(source_marker in blob, f"source marker missing from record: {source_marker}")
    need(source_marker in doc, f"source marker missing from doc: {source_marker}")

need(record["visibility"] == "private_operator_only", "visibility must be private operator only")
need(record["public_route_created"] is False, "public route must be false")

closeout = record["closeout_assertions"]
need(closeout["private_ledger_write_authorization_candidate_exists"] is True, "ledger auth candidate should exist")
need(closeout["private_ledger_write_authorization_example_exists"] is True, "ledger auth example should exist")
need(closeout["private_operator_only"] is True, "private operator only must be true")
need(closeout["public_route_created"] is False, "public route must be false")
need(closeout["public_index_mutated"] is False, "public index mutation must be false")
need(closeout["root_public_index_mutated"] is False, "root public index mutation must be false")
need(closeout["example_authorization_is_not_effective"] is True, "example auth not effective")
need(closeout["example_authorization_is_not_ledger_write_authorization"] is True, "example auth not ledger auth")
need(closeout["example_authorization_is_not_ledger_append"] is True, "example auth not ledger append")
need(closeout["requires_future_effective_ledger_write_authorization"] is True, "future effective auth required")
need(closeout["requires_future_ledger_write_candidate"] is True, "future ledger candidate required")
need(closeout["requires_future_ledger_line_creation"] is True, "future ledger line required")
need(closeout["requires_operator_final_review"] is True, "operator final review required")
need(closeout["example_amount_wc"] == 100, "example amount must be 100")
need(closeout["example_amount_is_not_approved_here"] is True, "example amount not approved")
need(closeout["example_amount_is_not_supply_limit"] is True, "example amount not supply limit")
need(closeout["effective_ledger_write_authorization_created"] is False, "effective auth must be false")
need(closeout["effective_operator_approval_created"] is False, "effective approval must be false")
need(closeout["operator_append_decision_created"] is False, "append decision must be false")
need(closeout["award_created"] is False, "award created must be false")
need(closeout["award_approved"] is False, "award approved must be false")
need(closeout["ledger_write_authorized"] is False, "ledger authorization must be false")
need(closeout["ledger_line_created"] is False, "ledger line must be false")
need(closeout["ledger_append_performed"] is False, "ledger append must be false")
need(closeout["wc_issuance_created"] is False, "WC issuance must be false")
need(closeout["wc_ledger_write_created"] is False, "WC ledger write must be false")
need(closeout["reward_created"] is False, "reward must be false")
need(closeout["void_transfer_created"] is False, "VOID transfer must be false")
need(closeout["runtime_append_endpoint_created"] is False, "runtime endpoint must be false")

private = record["private_boundary"]
need(private["operator_only"] is True, "operator-only must be true")
need(private["public_route_created"] is False, "public route must be false")
need(private["public_index_mutated"] is False, "public index mutated must be false")
need(private["root_public_index_mutated"] is False, "root public index mutated must be false")
need(private["wallet_connect_enabled"] is False, "wallet connect must be false")
need(private["server_side_submission_endpoint_created"] is False, "server endpoint must be false")
need(private["runtime_mutation_route_created"] is False, "runtime mutation route must be false")

auth = record["authorization_boundary"]
need(auth["private_ledger_write_authorization_closeout_only"] is True, "private ledger auth closeout only must be true")
need(auth["effective_ledger_write_authorization_created"] is False, "effective ledger auth must be false")
need(auth["effective_operator_approval_created"] is False, "effective approval must be false")
need(auth["operator_append_decision_created"] is False, "append decision must be false")
need(auth["award_created"] is False, "award created must be false")
need(auth["award_approved"] is False, "award approved must be false")
need(auth["ledger_write_authorized"] is False, "ledger authorized must be false")
need(auth["ledger_line_created"] is False, "ledger line created must be false")
need(auth["ledger_append_performed"] is False, "ledger append performed must be false")
need(auth["wc_issuance_created"] is False, "WC issuance must be false")
need(auth["wc_ledger_write_created"] is False, "WC ledger write must be false")
need(auth["reward_created"] is False, "reward must be false")
need(auth["void_transfer_created"] is False, "VOID transfer must be false")

policy = record["work_credit_policy"]
need(policy["wc_supply_policy"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work", "WC supply policy mismatch")
need(policy["issues_work_credits"] is False, "issues WC must be false")
need(policy["writes_work_credit_ledger"] is False, "writes ledger must be false")
need(policy["creates_award"] is False, "creates award must be false")
need(policy["creates_reward"] is False, "creates reward must be false")
need(policy["creates_void_transfer"] is False, "creates transfer must be false")

safety = record["safety_boundary"]
for key in [
    "work_credits_unlimited_uncapped",
    "no_wc_issuance",
    "no_wc_ledger_write",
    "no_ledger_line_creation",
    "no_ledger_append",
    "no_ledger_write_authorization",
    "no_effective_approval",
    "no_award_creation",
    "no_reward_creation",
    "no_void_transfer",
    "no_wallet_connect",
    "no_public_submission_route",
    "no_runtime_mutation_route",
    "no_secret_material"
]:
    need(safety[key] is True, f"safety boundary failed: {key}")

need(all(marker not in json.dumps(obj) for obj in [wc_index, root_index]), "private marker must not appear in public indices")

print("private_operator_ledger_write_authorization_closeout_binding_green=true")
PY

echo "== forbidden public mutation scan =="
if grep -R "$MARKER" public/public-node docs/public-node examples/public-node 2>/dev/null; then
  echo "private_ledger_write_authorization_closeout_marker_leaked_to_public_tree=true"
  exit 1
fi
echo "private_ledger_write_authorization_closeout_marker_not_in_public_tree_green=true"

echo "== forbidden WC cap wording scan =="
if grep -R "100,000,000 WC\|100000000 WC\|lifetime WC cap\|WC cap" "$DOC" "$PRIVATE_RECORD"; then
  echo "forbidden_wc_cap_language_found=true"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_FIRST_WORK_PACK_PRIVATE_OPERATOR_LEDGER_WRITE_AUTHORIZATION_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN"
