#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_PROPOSAL_HOLD_V1"
GEN_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1"
VERIFY_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_VERIFIER_HOLD_V1"
ROUNDTRIP_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_ROUNDTRIP_HOLD_V1"
QUEUE_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_QUEUE_HOLD_V1"
DECISION_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_DECISION_HOLD_V1"

GEN_TOOL="tools/datanet-wc-evidence-packet.mjs"
VERIFY_TOOL="tools/datanet-wc-evidence-packet-verify.mjs"
ROUNDTRIP_TOOL="tools/datanet-wc-evidence-packet-roundtrip.mjs"
QUEUE_TOOL="tools/datanet-wc-evidence-packet-review-queue.mjs"
DECISION_TOOL="tools/datanet-wc-evidence-packet-review-decision.mjs"
PROPOSAL_TOOL="tools/datanet-wc-evidence-packet-award-proposal.mjs"

DOC="docs/datanet/datanet-wc-evidence-packet-award-proposal-hold-v1.md"
DECISION_PROOF="ops/mainnet0/datanet-wc-evidence-packet-review-decision-hold-v1-proof.sh"
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
DECISION_CHANGES="$TMP_DIR/decision-changes.json"
PROPOSAL_A="$TMP_DIR/proposal-a.json"
PROPOSAL_B="$TMP_DIR/proposal-b.json"
PROPOSAL_OUT="$TMP_DIR/proposal-out.json"
CREATED_AT="2026-07-02T00:00:00.000Z"

echo "== tools exist / syntax =="
test -x "$GEN_TOOL"
test -x "$VERIFY_TOOL"
test -x "$ROUNDTRIP_TOOL"
test -x "$QUEUE_TOOL"
test -x "$DECISION_TOOL"
test -x "$PROPOSAL_TOOL"
node --check "$GEN_TOOL"
node --check "$VERIFY_TOOL"
node --check "$ROUNDTRIP_TOOL"
node --check "$QUEUE_TOOL"
node --check "$DECISION_TOOL"
node --check "$PROPOSAL_TOOL"

echo "== review decision source proof =="
bash "$DECISION_PROOF"

echo "== create accepted decision =="
VOID_PACKET_CREATED_AT="$CREATED_AT" node "$ROUNDTRIP_TOOL" \
  --input "$FIXTURE_DIR" \
  --packet-out "$PACKET" \
  --work-id "demo-datanet-verification-artifact" \
  --worker "local-contributor" \
  --reviewer "operator-review-required" \
  --verify-out "$VERIFY_OUT" \
  --summary-out "$SUMMARY" >/tmp/void-award-proposal-roundtrip.out

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
  --reason "fixture evidence packet verified and ready for separate award review" >/tmp/void-award-proposal-decision-accept.out

echo "== award proposal =="
VOID_AWARD_PROPOSAL_CREATED_AT="$CREATED_AT" node "$PROPOSAL_TOOL" \
  --decision "$DECISION_ACCEPT" \
  --out "$PROPOSAL_A" \
  --proposer "operator-reviewer" \
  --proposed-wc "100" \
  --reason "fixture verified useful DataNet evidence packet" > "$PROPOSAL_OUT"

VOID_AWARD_PROPOSAL_CREATED_AT="$CREATED_AT" node "$PROPOSAL_TOOL" \
  --decision "$DECISION_ACCEPT" \
  --out "$PROPOSAL_B" \
  --proposer "operator-reviewer" \
  --proposed-wc "100" \
  --reason "fixture verified useful DataNet evidence packet" >/tmp/void-award-proposal-b.out

cmp "$PROPOSAL_A" "$PROPOSAL_B"
echo "proposal_deterministic_green=true"

echo "== proposal binding =="
python3 - "$DECISION_ACCEPT" "$PROPOSAL_A" "$PROPOSAL_OUT" "$MARKER" "$DECISION_MARKER" "$QUEUE_MARKER" "$ROUNDTRIP_MARKER" "$GEN_MARKER" "$VERIFY_MARKER" <<'PY'
import json
import pathlib
import re
import sys

decision_path, proposal_path, out_path, marker, decision_marker, queue_marker, roundtrip_marker, gen_marker, verify_marker = sys.argv[1:10]

decision = json.load(open(decision_path, encoding="utf-8"))
proposal = json.load(open(proposal_path, encoding="utf-8"))
out = json.load(open(out_path, encoding="utf-8"))

assert out["marker"] == marker
assert out["status"] == "award_proposal_recorded"
assert out["proposal_id"] == proposal["proposal_id"]
assert pathlib.Path(out["out"]).exists()
assert out["proposed_wc_amount"] == "100"

assert proposal["schema"] == "void.datanet.wc.evidence_packet_award_proposal.v1"
assert proposal["marker"] == marker
assert proposal["status"] == "award_proposal_recorded"
assert re.fullmatch(r"[0-9a-f]{64}", proposal["proposal_id"])
assert proposal["proposer"] == "operator-reviewer"
assert proposal["proposed_wc_amount"] == "100"
assert "verified useful" in proposal["reason"]

source = proposal["source"]
assert source["decision_marker"] == decision_marker
assert source["decision_id"] == decision["decision_id"]
assert source["decision"] == "accept_evidence"
assert source["review_id"] == decision["source"]["review_id"]
assert source["evidence_hash"] == decision["source"]["evidence_hash"]
assert source["work_id"] == "demo-datanet-verification-artifact"
assert source["worker"] == "local-contributor"
assert source["files"] == 2
assert source["queue_marker"] == queue_marker
assert source["summary_marker"] == roundtrip_marker
assert source["generator_marker"] == gen_marker
assert source["verifier_marker"] == verify_marker

policy = proposal["work_credits_policy"]
assert policy["useful_verifiable_work_only"] is True
assert policy["unlimited_uncapped_accounting_units"] is True
assert policy["finite_proposed_amount_for_this_review"] is True
assert policy["operator_approval_required"] is True

boundary = proposal["boundary"]
assert boundary["award_proposal_record_only"] is True
assert boundary["award_proposal_amount_present"] is True
for key in [
    "wc_award_approval_enabled",
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

assert "no_approval" in out["boundary"]
assert "no_issuance" in out["boundary"]
assert "no_ledger_write" in out["boundary"]
assert "no_network_submit" in out["boundary"]

print("proposal_binding_green=true")
PY

echo "== non-accepted decision rejection =="
VOID_REVIEW_DECISION_CREATED_AT="$CREATED_AT" node "$DECISION_TOOL" \
  --queue-entry "$QUEUE_ENTRY" \
  --out "$DECISION_CHANGES" \
  --reviewer "operator-reviewer" \
  --decision "request_changes" \
  --reason "fixture asks for more evidence" >/tmp/void-award-proposal-decision-changes.out

if node "$PROPOSAL_TOOL" \
  --decision "$DECISION_CHANGES" \
  --out "$TMP_DIR/rejected-proposal.json" \
  --proposer "operator-reviewer" \
  --proposed-wc "100" \
  --reason "should fail" >/tmp/void-proposal-nonaccepted-out 2>/tmp/void-proposal-nonaccepted-err; then
  echo "non_accepted_decision_rejection_green=false"
  cat /tmp/void-proposal-nonaccepted-out
  exit 1
fi
grep -Fq "decision_not_accept_evidence" /tmp/void-proposal-nonaccepted-err
echo "non_accepted_decision_rejection_green=true"

echo "== invalid amount rejection =="
if node "$PROPOSAL_TOOL" \
  --decision "$DECISION_ACCEPT" \
  --out "$TMP_DIR/bad-amount-proposal.json" \
  --proposer "operator-reviewer" \
  --proposed-wc "0" \
  --reason "bad amount should fail" >/tmp/void-proposal-bad-amount-out 2>/tmp/void-proposal-bad-amount-err; then
  echo "invalid_amount_rejection_green=false"
  cat /tmp/void-proposal-bad-amount-out
  exit 1
fi
grep -Fq "proposed_wc_amount_invalid" /tmp/void-proposal-bad-amount-err
echo "invalid_amount_rejection_green=true"

echo "== marker/source presence =="
grep -Fq "$MARKER" "$PROPOSAL_TOOL"
grep -Fq "$MARKER" "$DOC"
grep -Fq "$MARKER" "$0"
grep -Fq "$DECISION_MARKER" "$PROPOSAL_TOOL"
grep -Fq "$QUEUE_MARKER" "$PROPOSAL_TOOL"
grep -Fq "$ROUNDTRIP_MARKER" "$PROPOSAL_TOOL"
grep -Fq "$GEN_MARKER" "$PROPOSAL_TOOL"
grep -Fq "$VERIFY_MARKER" "$PROPOSAL_TOOL"

echo "== forbidden WC cap wording scan =="
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$PROPOSAL_TOOL" "$DOC"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== no mutation authority scan =="
if grep -RInE 'privateKey|mnemonic|signTransaction|sendTransaction|ledger[[:space:]_-]*write[[:space:]]*=[[:space:]]*true|wc_issuance_enabled[[:space:]]*:[[:space:]]*true|network_submit_enabled[[:space:]]*:[[:space:]]*true|wc_award_approval_enabled[[:space:]]*:[[:space:]]*true' "$PROPOSAL_TOOL" "$DOC"; then
  echo "no_mutation_authority_scan_green=false"
  exit 1
fi
echo "no_mutation_authority_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_PROPOSAL_HOLD_V1_GREEN"
