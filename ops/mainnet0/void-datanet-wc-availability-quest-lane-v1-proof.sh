#!/usr/bin/env bash

DOC="docs/work-credits/void-datanet-wc-availability-quest-lane-v1.md"
FIXTURE="fixtures/work-credits/void-datanet-wc-availability-quest-lane-v1.json"
MARKER="VOID_DATANET_WC_AVAILABILITY_QUEST_LANE_V1"

fail() {
  echo "void_datanet_wc_availability_quest_lane_v1_proof=FAIL reason=$1"
  exit 1
}

[ -f "$DOC" ] || fail "missing_doc"
[ -f "$FIXTURE" ] || fail "missing_fixture"

grep -Fq "$MARKER" "$DOC" || fail "missing_marker_doc"
grep -Fq "$MARKER" "$FIXTURE" || fail "missing_marker_fixture"

grep -Fq "Definition/proof-only quest lane; no WC issuance" "$DOC" || fail "missing_definition_only_status"
grep -Fq "This is not an automatic WC faucet." "$DOC" || fail "missing_no_faucet_clause"
grep -Fq "Only \`approved_for_wc_review\` may later feed a separate WC award decision packet." "$DOC" || fail "missing_separate_wc_decision_boundary"

grep -Fq "issue Work Credits" "$DOC" || fail "missing_no_wc_issue_doc"
grep -Fq "write the WC ledger" "$DOC" || fail "missing_no_wc_ledger_doc"
grep -Fq "allocate VOID" "$DOC" || fail "missing_no_void_allocation_doc"
grep -Fq "transfer VOID" "$DOC" || fail "missing_no_void_transfer_doc"
grep -Fq "activate public mutation" "$DOC" || fail "missing_no_public_mutation_doc"
grep -Fq "grant signer or wallet access" "$DOC" || fail "missing_no_signer_wallet_doc"

python3 - "$FIXTURE" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)

assert data["marker"] == "VOID_DATANET_WC_AVAILABILITY_QUEST_LANE_V1"
assert data["status"] == "definition_proof_only_no_wc_issuance"

quest = data["quest"]
assert quest["kind"] == "datanet_availability_work_credit_lane"
assert "approved_for_wc_review" in quest["states"]

required = set(data["evidence_packet_required_fields"])
for field in [
    "participant_id",
    "object_id_or_content_root",
    "manifest_hash",
    "root_commitment",
    "chunk_count",
    "chunk_proof_summary",
    "availability_proof",
    "retrieval_proof_or_peer_observation",
    "timestamp",
    "reviewer_status"
]:
    assert field in required

wc = data["wc_boundary"]
assert wc["issues_work_credits"] is False
assert wc["writes_wc_ledger"] is False
assert wc["allocates_void"] is False
assert wc["transfers_void"] is False
assert wc["automatic_reward"] is False
assert wc["bypasses_reviewer_approval"] is False

auth = data["authority_boundary"]
assert auth["activates_public_mutation"] is False
assert auth["grants_signer_wallet_access"] is False
assert auth["authorizes_execution"] is False
assert auth["moves_funds"] is False
assert auth["changes_datanet_storage"] is False
assert auth["exposes_private_objects"] is False

print("fixture_json_green=true")
PY

echo "void_datanet_wc_availability_quest_lane_v1_proof=GREEN marker=$MARKER"
