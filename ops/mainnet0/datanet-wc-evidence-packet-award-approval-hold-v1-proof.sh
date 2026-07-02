#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_APPROVAL_HOLD_V1"
GEN_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1"
VERIFY_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_VERIFIER_HOLD_V1"
ROUNDTRIP_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_ROUNDTRIP_HOLD_V1"
QUEUE_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_QUEUE_HOLD_V1"
DECISION_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_DECISION_HOLD_V1"
PROPOSAL_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_PROPOSAL_HOLD_V1"

GEN_TOOL="tools/datanet-wc-evidence-packet.mjs"
VERIFY_TOOL="tools/datanet-wc-evidence-packet-verify.mjs"
ROUNDTRIP_TOOL="tools/datanet-wc-evidence-packet-roundtrip.mjs"
QUEUE_TOOL="tools/datanet-wc-evidence-packet-review-queue.mjs"
DECISION_TOOL="tools/datanet-wc-evidence-packet-review-decision.mjs"
PROPOSAL_TOOL="tools/datanet-wc-evidence-packet-award-proposal.mjs"
APPROVAL_TOOL="tools/datanet-wc-evidence-packet-award-approval.mjs"

DOC="docs/datanet/datanet-wc-evidence-packet-award-approval-hold-v1.md"
PROPOSAL_PROOF="ops/mainnet0/datanet-wc-evidence-packet-award-proposal-hold-v1-proof.sh"
FIXTURE_DIR="fixtures/datanet-wc-evidence-packet/sample-input"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

PACKET="$TMP_DIR/packet.json"
VERIFY_OUT="$TMP_DIR/verify-out.json"
SUMMARY="$TMP_DIR/summary.json"
QUEUE_DIR="$TMP_DIR/queue"
QUEUE_OUT="$TMP_DIR/queue-out.json"
QUEUE_ENTRY="$TMP_DIR/queue-entry.json"
DECISION_ACCEPT="$TMP_DIR/decision-accept.json"
PROPOSAL="$TMP_DIR/proposal.json"
APPROVAL_A="$TMP_DIR/approval-a.json"
APPROVAL_B="$TMP_DIR/approval-b.json"
APPROVAL_OUT="$TMP_DIR/approval-out.json"
CHANGES_APPROVAL="$TMP_DIR/changes-approval.json"
BAD_PROPOSAL="$TMP_DIR/bad-proposal.json"
CREATED_AT="2026-07-02T00:00:00.000Z"

echo "== tools exist / syntax =="
test -x "$GEN_TOOL"
test -x "$VERIFY_TOOL"
test -x "$ROUNDTRIP_TOOL"
test -x "$QUEUE_TOOL"
test -x "$DECISION_TOOL"
test -x "$PROPOSAL_TOOL"
test -x "$APPROVAL_TOOL"
node --check "$GEN_TOOL"
node --check "$VERIFY_TOOL"
node --check "$ROUNDTRIP_TOOL"
node --check "$QUEUE_TOOL"
node --check "$DECISION_TOOL"
node --check "$PROPOSAL_TOOL"
node --check "$APPROVAL_TOOL"

echo "== award proposal source proof =="
bash "$PROPOSAL_PROOF"

echo "== create proposal =="
VOID_PACKET_CREATED_AT="$CREATED_AT" node "$ROUNDTRIP_TOOL" \
  --input "$FIXTURE_DIR" \
  --packet-out "$PACKET" \
  --work-id "demo-datanet-verification-artifact" \
  --worker "local-contributor" \
  --reviewer "operator-review-required" \
  --verify-out "$VERIFY_OUT" \
  --summary-out "$SUMMARY" >/tmp/void-award-approval-roundtrip.out

VOID_REVIEW_QUEUE_CREATED_AT="$CREATED_AT" node "$QUEUE_TOOL" \
  --summary "$SUMMARY" \
  --queue-dir "$QUEUE_DIR" \
  --reviewer "operator-reviewer" \
  --note "fixture pending operator review" > "$QUEUE_OUT"

python3 - "$QUEUE_OUT" "$QUEUE_ENTRY" <<'PY'
import json
import shutil
import sys

out = json.load(open(sys.argv[1], encoding="utf-8"))
shutil.copyfile(out["queue_file"], sys.argv[2])
print("queue_entry_copy_green=true")
PY

VOID_REVIEW_DECISION_CREATED_AT="$CREATED_AT" node "$DECISION_TOOL" \
  --queue-entry "$QUEUE_ENTRY" \
  --out "$DECISION_ACCEPT" \
  --reviewer "operator-reviewer" \
  --decision "accept_evidence" \
  --reason "fixture evidence packet verified and ready for separate award review" >/tmp/void-award-approval-decision.out

VOID_AWARD_PROPOSAL_CREATED_AT="$CREATED_AT" node "$PROPOSAL_TOOL" \
  --decision "$DECISION_ACCEPT" \
  --out "$PROPOSAL" \
  --proposer "operator-reviewer" \
  --proposed-wc "100" \
  --reason "fixture verified useful DataNet evidence packet" >/tmp/void-award-approval-proposal.out

echo "== award approval =="
VOID_AWARD_APPROVAL_CREATED_AT="$CREATED_AT" node "$APPROVAL_TOOL" \
  --proposal "$PROPOSAL" \
  --out "$APPROVAL_A" \
  --approver "operator-approver" \
  --decision "approve_award" \
  --reason "fixture award proposal approved for separate ledger write review" > "$APPROVAL_OUT"

VOID_AWARD_APPROVAL_CREATED_AT="$CREATED_AT" node "$APPROVAL_TOOL" \
  --proposal "$PROPOSAL" \
  --out "$APPROVAL_B" \
  --approver "operator-approver" \
  --decision "approve_award" \
  --reason "fixture award proposal approved for separate ledger write review" >/tmp/void-award-approval-b.out

cmp "$APPROVAL_A" "$APPROVAL_B"
echo "approval_deterministic_green=true"

echo "== approval binding =="
python3 - "$PROPOSAL" "$APPROVAL_A" "$APPROVAL_OUT" "$MARKER" "$PROPOSAL_MARKER" "$DECISION_MARKER" "$QUEUE_MARKER" "$ROUNDTRIP_MARKER" "$GEN_MARKER" "$VERIFY_MARKER" <<'PY'
import json
import pathlib
import re
import sys

proposal_path, approval_path, out_path, marker, proposal_marker, decision_marker, queue_marker, roundtrip_marker, gen_marker, verify_marker = sys.argv[1:11]

proposal = json.load(open(proposal_path, encoding="utf-8"))
approval = json.load(open(approval_path, encoding="utf-8"))
out = json.load(open(out_path, encoding="utf-8"))

assert out["marker"] == marker
assert out["status"] == "award_approval_recorded"
assert out["approval_id"] == approval["approval_id"]
assert pathlib.Path(out["out"]).exists()
assert out["approval_decision"] == "approve_award"
assert out["approved_wc_amount"] == "100"

assert approval["schema"] == "void.datanet.wc.evidence_packet_award_approval.v1"
assert approval["marker"] == marker
assert approval["status"] == "award_approval_recorded"
assert re.fullmatch(r"[0-9a-f]{64}", approval["approval_id"])
assert approval["approver"] == "operator-approver"
assert approval["approval_decision"] == "approve_award"
assert approval["approved_wc_amount"] == "100"
assert "separate ledger write review" in approval["reason"]

source = approval["source"]
assert source["proposal_marker"] == proposal_marker
assert source["proposal_id"] == proposal["proposal_id"]
assert source["proposed_wc_amount"] == "100"
assert source["decision_marker"] == decision_marker
assert source["decision"] == "accept_evidence"
assert source["queue_marker"] == queue_marker
assert source["summary_marker"] == roundtrip_marker
assert source["generator_marker"] == gen_marker
assert source["verifier_marker"] == verify_marker
assert source["work_id"] == "demo-datanet-verification-artifact"
assert source["worker"] == "local-contributor"
assert source["files"] == 2

policy = approval["work_credits_policy"]
assert policy["useful_verifiable_work_only"] is True
assert policy["unlimited_uncapped_accounting_units"] is True
assert policy["finite_approved_amount_for_this_review"] is True
assert policy["separate_ledger_write_required"] is True

boundary = approval["boundary"]
assert boundary["award_approval_record_only"] is True
for key in [
    "wc_issuance_enabled",
    "wc_claim_enabled",
    "wc_ledger_write_enabled",
    "void_transfer_enabled",
    "usdc_transfer_enabled",
    "wallet_connection_enabled",
    "signer_access_enabled",
    "network_submit_enabled",
    "public_mutation_enabled",
]:
    assert boundary[key] is False, key

assert "no_issuance" in out["boundary"]
assert "no_claim" in out["boundary"]
assert "no_ledger_write" in out["boundary"]
assert "no_network_submit" in out["boundary"]

print("approval_binding_green=true")
PY

echo "== request changes approval path =="
VOID_AWARD_APPROVAL_CREATED_AT="$CREATED_AT" node "$APPROVAL_TOOL" \
  --proposal "$PROPOSAL" \
  --out "$CHANGES_APPROVAL" \
  --approver "operator-approver" \
  --decision "request_changes" \
  --reason "fixture asks proposal author to clarify amount" >/tmp/void-award-approval-changes.out

python3 - "$CHANGES_APPROVAL" <<'PY'
import json
import sys

record = json.load(open(sys.argv[1], encoding="utf-8"))
assert record["approval_decision"] == "request_changes"
assert record["approved_wc_amount"] is None
assert record["work_credits_policy"]["finite_approved_amount_for_this_review"] is False
assert record["work_credits_policy"]["separate_ledger_write_required"] is False
print("request_changes_path_green=true")
PY

echo "== invalid approval decision rejection =="
if node "$APPROVAL_TOOL" \
  --proposal "$PROPOSAL" \
  --out "$TMP_DIR/bad-approval.json" \
  --approver "operator-approver" \
  --decision "issue_wc" \
  --reason "not allowed" >/tmp/void-approval-bad-decision-out 2>/tmp/void-approval-bad-decision-err; then
  echo "invalid_approval_decision_rejection_green=false"
  cat /tmp/void-approval-bad-decision-out
  exit 1
fi
grep -Fq "approval_decision_not_allowed" /tmp/void-approval-bad-decision-err
echo "invalid_approval_decision_rejection_green=true"

echo "== bad proposal rejection =="
python3 - "$PROPOSAL" "$BAD_PROPOSAL" <<'PY'
import json
import sys

proposal = json.load(open(sys.argv[1], encoding="utf-8"))
proposal["status"] = "not_recorded"
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(proposal, indent=2) + "\n")
PY

if node "$APPROVAL_TOOL" \
  --proposal "$BAD_PROPOSAL" \
  --out "$TMP_DIR/bad-proposal-approval.json" \
  --approver "operator-approver" \
  --decision "approve_award" \
  --reason "bad proposal should fail" >/tmp/void-approval-bad-proposal-out 2>/tmp/void-approval-bad-proposal-err; then
  echo "bad_proposal_rejection_green=false"
  cat /tmp/void-approval-bad-proposal-out
  exit 1
fi
grep -Fq "proposal_status_mismatch" /tmp/void-approval-bad-proposal-err
echo "bad_proposal_rejection_green=true"

echo "== marker/source presence =="
grep -Fq "$MARKER" "$APPROVAL_TOOL"
grep -Fq "$MARKER" "$DOC"
grep -Fq "$MARKER" "$0"
grep -Fq "$PROPOSAL_MARKER" "$APPROVAL_TOOL"
grep -Fq "$DECISION_MARKER" "$APPROVAL_TOOL"
grep -Fq "$QUEUE_MARKER" "$APPROVAL_TOOL"
grep -Fq "$ROUNDTRIP_MARKER" "$APPROVAL_TOOL"
grep -Fq "$GEN_MARKER" "$APPROVAL_TOOL"
grep -Fq "$VERIFY_MARKER" "$APPROVAL_TOOL"

echo "== forbidden WC cap wording scan =="
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$APPROVAL_TOOL" "$DOC"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== no mutation authority scan =="
if grep -RInE 'privateKey|mnemonic|signTransaction|sendTransaction|ledger[[:space:]_-]*write[[:space:]]*=[[:space:]]*true|wc_issuance_enabled[[:space:]]*:[[:space:]]*true|network_submit_enabled[[:space:]]*:[[:space:]]*true' "$APPROVAL_TOOL" "$DOC"; then
  echo "no_mutation_authority_scan_green=false"
  exit 1
fi
echo "no_mutation_authority_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_APPROVAL_HOLD_V1_GREEN"
