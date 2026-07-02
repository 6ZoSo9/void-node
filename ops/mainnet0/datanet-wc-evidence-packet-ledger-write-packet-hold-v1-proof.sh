#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_WRITE_PACKET_HOLD_V1"
APPROVAL_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_APPROVAL_HOLD_V1"
PROPOSAL_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_PROPOSAL_HOLD_V1"
DECISION_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_DECISION_HOLD_V1"
QUEUE_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_QUEUE_HOLD_V1"
ROUNDTRIP_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_ROUNDTRIP_HOLD_V1"
GEN_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1"
VERIFY_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_VERIFIER_HOLD_V1"

GEN_TOOL="tools/datanet-wc-evidence-packet.mjs"
VERIFY_TOOL="tools/datanet-wc-evidence-packet-verify.mjs"
ROUNDTRIP_TOOL="tools/datanet-wc-evidence-packet-roundtrip.mjs"
QUEUE_TOOL="tools/datanet-wc-evidence-packet-review-queue.mjs"
DECISION_TOOL="tools/datanet-wc-evidence-packet-review-decision.mjs"
PROPOSAL_TOOL="tools/datanet-wc-evidence-packet-award-proposal.mjs"
APPROVAL_TOOL="tools/datanet-wc-evidence-packet-award-approval.mjs"
LEDGER_PACKET_TOOL="tools/datanet-wc-evidence-packet-ledger-write-packet.mjs"

DOC="docs/datanet/datanet-wc-evidence-packet-ledger-write-packet-hold-v1.md"
APPROVAL_PROOF="ops/mainnet0/datanet-wc-evidence-packet-award-approval-hold-v1-proof.sh"
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
APPROVAL_OK="$TMP_DIR/approval-ok.json"
APPROVAL_CHANGES="$TMP_DIR/approval-changes.json"
LEDGER_A="$TMP_DIR/ledger-a.json"
LEDGER_B="$TMP_DIR/ledger-b.json"
LEDGER_OUT="$TMP_DIR/ledger-out.json"
BAD_APPROVAL="$TMP_DIR/bad-approval.json"
CREATED_AT="2026-07-02T00:00:00.000Z"

echo "== tools exist / syntax =="
for tool in "$GEN_TOOL" "$VERIFY_TOOL" "$ROUNDTRIP_TOOL" "$QUEUE_TOOL" "$DECISION_TOOL" "$PROPOSAL_TOOL" "$APPROVAL_TOOL" "$LEDGER_PACKET_TOOL"; do
  test -x "$tool"
  node --check "$tool"
done

echo "== award approval source proof =="
bash "$APPROVAL_PROOF"

echo "== create approved chain =="
VOID_PACKET_CREATED_AT="$CREATED_AT" node "$ROUNDTRIP_TOOL" \
  --input "$FIXTURE_DIR" \
  --packet-out "$PACKET" \
  --work-id "demo-datanet-verification-artifact" \
  --worker "local-contributor" \
  --reviewer "operator-review-required" \
  --verify-out "$VERIFY_OUT" \
  --summary-out "$SUMMARY" >/tmp/void-ledger-write-packet-roundtrip.out

VOID_REVIEW_QUEUE_CREATED_AT="$CREATED_AT" node "$QUEUE_TOOL" \
  --summary "$SUMMARY" \
  --queue-dir "$QUEUE_DIR" \
  --reviewer "operator-reviewer" \
  --note "fixture pending operator review" > "$QUEUE_OUT"

python3 - "$QUEUE_OUT" "$QUEUE_ENTRY" <<'PY'
import json, shutil, sys
out = json.load(open(sys.argv[1], encoding="utf-8"))
shutil.copyfile(out["queue_file"], sys.argv[2])
print("queue_entry_copy_green=true")
PY

VOID_REVIEW_DECISION_CREATED_AT="$CREATED_AT" node "$DECISION_TOOL" \
  --queue-entry "$QUEUE_ENTRY" \
  --out "$DECISION_ACCEPT" \
  --reviewer "operator-reviewer" \
  --decision "accept_evidence" \
  --reason "fixture evidence packet verified and ready for separate award review" >/tmp/void-ledger-write-packet-decision.out

VOID_AWARD_PROPOSAL_CREATED_AT="$CREATED_AT" node "$PROPOSAL_TOOL" \
  --decision "$DECISION_ACCEPT" \
  --out "$PROPOSAL" \
  --proposer "operator-reviewer" \
  --proposed-wc "100" \
  --reason "fixture verified useful DataNet evidence packet" >/tmp/void-ledger-write-packet-proposal.out

VOID_AWARD_APPROVAL_CREATED_AT="$CREATED_AT" node "$APPROVAL_TOOL" \
  --proposal "$PROPOSAL" \
  --out "$APPROVAL_OK" \
  --approver "operator-approver" \
  --decision "approve_award" \
  --reason "fixture award proposal approved for separate ledger write review" >/tmp/void-ledger-write-packet-approval.out

echo "== ledger write packet =="
VOID_LEDGER_WRITE_PACKET_CREATED_AT="$CREATED_AT" node "$LEDGER_PACKET_TOOL" \
  --approval "$APPROVAL_OK" \
  --out "$LEDGER_A" \
  --operator "operator-ledger-preparer" \
  --ledger "datanet-wc-awards" \
  --reason "fixture ready for separate operator ledger append review" > "$LEDGER_OUT"

VOID_LEDGER_WRITE_PACKET_CREATED_AT="$CREATED_AT" node "$LEDGER_PACKET_TOOL" \
  --approval "$APPROVAL_OK" \
  --out "$LEDGER_B" \
  --operator "operator-ledger-preparer" \
  --ledger "datanet-wc-awards" \
  --reason "fixture ready for separate operator ledger append review" >/tmp/void-ledger-write-packet-b.out

cmp "$LEDGER_A" "$LEDGER_B"
echo "ledger_write_packet_deterministic_green=true"

echo "== ledger write packet binding =="
python3 - "$APPROVAL_OK" "$LEDGER_A" "$LEDGER_OUT" "$MARKER" "$APPROVAL_MARKER" "$PROPOSAL_MARKER" "$DECISION_MARKER" "$QUEUE_MARKER" "$ROUNDTRIP_MARKER" "$GEN_MARKER" "$VERIFY_MARKER" <<'PY'
import json, pathlib, re, sys

approval_path, ledger_path, out_path, marker, approval_marker, proposal_marker, decision_marker, queue_marker, roundtrip_marker, gen_marker, verify_marker = sys.argv[1:12]
approval = json.load(open(approval_path, encoding="utf-8"))
ledger = json.load(open(ledger_path, encoding="utf-8"))
out = json.load(open(out_path, encoding="utf-8"))

assert out["marker"] == marker
assert out["status"] == "ledger_write_packet_recorded"
assert out["packet_id"] == ledger["packet_id"]
assert pathlib.Path(out["out"]).exists()
assert out["approved_wc_amount"] == "100"

assert ledger["schema"] == "void.datanet.wc.evidence_packet_ledger_write_packet.v1"
assert ledger["marker"] == marker
assert ledger["status"] == "ledger_write_packet_recorded"
assert re.fullmatch(r"[0-9a-f]{64}", ledger["packet_id"])
assert ledger["operator"] == "operator-ledger-preparer"
assert ledger["ledger"] == "datanet-wc-awards"

intent = ledger["ledger_write_intent"]
assert intent["operation"] == "append_only_candidate"
assert intent["worker"] == "local-contributor"
assert intent["work_id"] == "demo-datanet-verification-artifact"
assert intent["approved_wc_amount"] == "100"
assert intent["approval_id"] == approval["approval_id"]

source = ledger["source"]
assert source["approval_marker"] == approval_marker
assert source["approval_id"] == approval["approval_id"]
assert source["approval_decision"] == "approve_award"
assert source["proposal_marker"] == proposal_marker
assert source["decision_marker"] == decision_marker
assert source["decision"] == "accept_evidence"
assert source["queue_marker"] == queue_marker
assert source["summary_marker"] == roundtrip_marker
assert source["generator_marker"] == gen_marker
assert source["verifier_marker"] == verify_marker
assert source["worker"] == "local-contributor"
assert source["work_id"] == "demo-datanet-verification-artifact"
assert source["files"] == 2

policy = ledger["work_credits_policy"]
assert policy["useful_verifiable_work_only"] is True
assert policy["unlimited_uncapped_accounting_units"] is True
assert policy["finite_approved_amount_for_this_review"] is True
assert policy["separate_operator_execution_required"] is True

boundary = ledger["boundary"]
assert boundary["ledger_write_packet_only"] is True
assert boundary["ledger_append_performed"] is False
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

assert "no_append" in out["boundary"]
assert "no_issuance" in out["boundary"]
assert "no_claim" in out["boundary"]
assert "no_network_submit" in out["boundary"]
print("ledger_write_packet_binding_green=true")
PY

echo "== non-approved approval rejection =="
VOID_AWARD_APPROVAL_CREATED_AT="$CREATED_AT" node "$APPROVAL_TOOL" \
  --proposal "$PROPOSAL" \
  --out "$APPROVAL_CHANGES" \
  --approver "operator-approver" \
  --decision "request_changes" \
  --reason "fixture asks proposal author to clarify amount" >/tmp/void-ledger-write-packet-changes.out

if node "$LEDGER_PACKET_TOOL" \
  --approval "$APPROVAL_CHANGES" \
  --out "$TMP_DIR/rejected-ledger.json" \
  --operator "operator-ledger-preparer" \
  --ledger "datanet-wc-awards" \
  --reason "should fail" >/tmp/void-ledger-nonapproved-out 2>/tmp/void-ledger-nonapproved-err; then
  echo "non_approved_approval_rejection_green=false"
  cat /tmp/void-ledger-nonapproved-out
  exit 1
fi
grep -Fq "approval_decision_not_approve_award" /tmp/void-ledger-nonapproved-err
echo "non_approved_approval_rejection_green=true"

echo "== bad approval rejection =="
python3 - "$APPROVAL_OK" "$BAD_APPROVAL" <<'PY'
import json, sys
approval = json.load(open(sys.argv[1], encoding="utf-8"))
approval["approved_wc_amount"] = "0"
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(approval, indent=2) + "\n")
PY

if node "$LEDGER_PACKET_TOOL" \
  --approval "$BAD_APPROVAL" \
  --out "$TMP_DIR/bad-ledger.json" \
  --operator "operator-ledger-preparer" \
  --ledger "datanet-wc-awards" \
  --reason "bad approval should fail" >/tmp/void-ledger-bad-approval-out 2>/tmp/void-ledger-bad-approval-err; then
  echo "bad_approval_rejection_green=false"
  cat /tmp/void-ledger-bad-approval-out
  exit 1
fi
grep -Fq "approved_wc_amount_invalid" /tmp/void-ledger-bad-approval-err
echo "bad_approval_rejection_green=true"

echo "== marker/source presence =="
grep -Fq "$MARKER" "$LEDGER_PACKET_TOOL"
grep -Fq "$MARKER" "$DOC"
grep -Fq "$MARKER" "$0"

echo "== forbidden WC cap wording scan =="
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$LEDGER_PACKET_TOOL" "$DOC"; then
  echo "forbidden_wc_cap_scan_green=false"; exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== no mutation authority scan =="
if grep -RInE 'privateKey|mnemonic|signTransaction|sendTransaction|ledger[[:space:]_-]*append[[:space:]]*=[[:space:]]*true|ledger[[:space:]_-]*write[[:space:]]*=[[:space:]]*true|wc_ledger_write_enabled[[:space:]]*:[[:space:]]*true|wc_issuance_enabled[[:space:]]*:[[:space:]]*true|network_submit_enabled[[:space:]]*:[[:space:]]*true' "$LEDGER_PACKET_TOOL" "$DOC"; then
  echo "no_mutation_authority_scan_green=false"; exit 1
fi
echo "no_mutation_authority_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_WRITE_PACKET_HOLD_V1_GREEN"
