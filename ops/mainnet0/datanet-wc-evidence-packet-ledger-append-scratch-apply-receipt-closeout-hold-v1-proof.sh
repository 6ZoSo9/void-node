#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_HOLD_V1"
RECEIPT_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_HOLD_V1"
SCRATCH_APPLY_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_HOLD_V1"
EXECUTE_PACKET_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_EXECUTE_PACKET_HOLD_V1"

GEN_TOOL="tools/datanet-wc-evidence-packet.mjs"
VERIFY_TOOL="tools/datanet-wc-evidence-packet-verify.mjs"
ROUNDTRIP_TOOL="tools/datanet-wc-evidence-packet-roundtrip.mjs"
QUEUE_TOOL="tools/datanet-wc-evidence-packet-review-queue.mjs"
DECISION_TOOL="tools/datanet-wc-evidence-packet-review-decision.mjs"
PROPOSAL_TOOL="tools/datanet-wc-evidence-packet-award-proposal.mjs"
APPROVAL_TOOL="tools/datanet-wc-evidence-packet-award-approval.mjs"
LEDGER_PACKET_TOOL="tools/datanet-wc-evidence-packet-ledger-write-packet.mjs"
DRY_RUN_TOOL="tools/datanet-wc-evidence-packet-ledger-append-dry-run.mjs"
EXECUTE_PACKET_TOOL="tools/datanet-wc-evidence-packet-ledger-append-execute-packet.mjs"
SCRATCH_APPLY_TOOL="tools/datanet-wc-evidence-packet-ledger-append-scratch-apply.mjs"
RECEIPT_TOOL="tools/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt.mjs"
CLOSEOUT_TOOL="tools/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt-closeout.mjs"
DOC="docs/datanet/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt-closeout-hold-v1.md"
RECEIPT_PROOF="ops/mainnet0/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt-hold-v1-proof.sh"
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
LEDGER_PACKET="$TMP_DIR/ledger-packet.json"
DRY_RUN="$TMP_DIR/dry-run.json"
EXECUTE_PACKET="$TMP_DIR/execute-packet.json"
LEDGER_IN="$TMP_DIR/scratch-ledger-in.jsonl"
LEDGER_OUT="$TMP_DIR/scratch-ledger-out.jsonl"
SCRATCH_APPLY="$TMP_DIR/scratch-apply.json"
RECEIPT="$TMP_DIR/receipt.json"
CLOSEOUT_A="$TMP_DIR/closeout-a.json"
CLOSEOUT_B="$TMP_DIR/closeout-b.json"
BAD_RECEIPT="$TMP_DIR/bad-receipt.json"
BAD_MARKER="$TMP_DIR/bad-marker-receipt.json"

CREATED_AT="2026-07-02T00:00:00.000Z"
ZERO_HASH="0000000000000000000000000000000000000000000000000000000000000000"
SCRATCH_CONFIRM="I_UNDERSTAND_THIS_WRITES_ONLY_A_SCRATCH_LEDGER_PREVIEW"
EXECUTE_CONFIRM="I_UNDERSTAND_THIS_IS_EXECUTE_PACKET_ONLY_NO_APPEND"

printf '== tools exist / syntax ==\n'
for tool in \
  "$GEN_TOOL" "$VERIFY_TOOL" "$ROUNDTRIP_TOOL" "$QUEUE_TOOL" "$DECISION_TOOL" \
  "$PROPOSAL_TOOL" "$APPROVAL_TOOL" "$LEDGER_PACKET_TOOL" "$DRY_RUN_TOOL" \
  "$EXECUTE_PACKET_TOOL" "$SCRATCH_APPLY_TOOL" "$RECEIPT_TOOL" "$CLOSEOUT_TOOL"; do
  test -x "$tool"
  node --check "$tool"
done
bash -n "$RECEIPT_PROOF"

printf '== scratch apply receipt source proof ==\n'
bash "$RECEIPT_PROOF"

printf '== create scratch apply receipt ==\n'
VOID_PACKET_CREATED_AT="$CREATED_AT" node "$ROUNDTRIP_TOOL" \
  --input "$FIXTURE_DIR" \
  --packet-out "$PACKET" \
  --work-id "demo-datanet-verification-artifact" \
  --worker "local-contributor" \
  --reviewer "operator-review-required" \
  --verify-out "$VERIFY_OUT" \
  --summary-out "$SUMMARY" >/tmp/void-scratch-receipt-closeout-roundtrip.out

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
  --reason "fixture evidence packet verified and ready for separate award review" >/tmp/void-scratch-receipt-closeout-decision.out

VOID_AWARD_PROPOSAL_CREATED_AT="$CREATED_AT" node "$PROPOSAL_TOOL" \
  --decision "$DECISION_ACCEPT" \
  --out "$PROPOSAL" \
  --proposer "operator-reviewer" \
  --proposed-wc "100" \
  --reason "fixture verified useful DataNet evidence packet" >/tmp/void-scratch-receipt-closeout-proposal.out

VOID_AWARD_APPROVAL_CREATED_AT="$CREATED_AT" node "$APPROVAL_TOOL" \
  --proposal "$PROPOSAL" \
  --out "$APPROVAL_OK" \
  --approver "operator-approver" \
  --decision "approve_award" \
  --reason "fixture award proposal approved for separate ledger write review" >/tmp/void-scratch-receipt-closeout-approval.out

VOID_LEDGER_WRITE_PACKET_CREATED_AT="$CREATED_AT" node "$LEDGER_PACKET_TOOL" \
  --approval "$APPROVAL_OK" \
  --out "$LEDGER_PACKET" \
  --operator "operator-ledger-preparer" \
  --ledger "datanet-wc-awards" \
  --reason "fixture ready for separate operator ledger append review" >/tmp/void-scratch-receipt-closeout-ledger-packet.out

VOID_LEDGER_APPEND_DRY_RUN_CREATED_AT="$CREATED_AT" node "$DRY_RUN_TOOL" \
  --packet "$LEDGER_PACKET" \
  --out "$DRY_RUN" \
  --operator "operator-ledger-preparer" \
  --ledger-current-hash "$ZERO_HASH" \
  --reason "fixture dry-run before separate operator append" >/tmp/void-scratch-receipt-closeout-dry-run.out

VOID_LEDGER_APPEND_EXECUTE_PACKET_CREATED_AT="$CREATED_AT" node "$EXECUTE_PACKET_TOOL" \
  --dry-run "$DRY_RUN" \
  --out "$EXECUTE_PACKET" \
  --operator "operator-ledger-preparer" \
  --execution-mode "manual_operator_append_review" \
  --confirm "$EXECUTE_CONFIRM" \
  --reason "fixture ready for separate manual append execution" >/tmp/void-scratch-receipt-closeout-execute-packet.out

: > "$LEDGER_IN"
VOID_LEDGER_APPEND_SCRATCH_APPLY_CREATED_AT="$CREATED_AT" node "$SCRATCH_APPLY_TOOL" \
  --execute-packet "$EXECUTE_PACKET" \
  --ledger-in "$LEDGER_IN" \
  --ledger-out "$LEDGER_OUT" \
  --operator "operator-ledger-preparer" \
  --confirm "$SCRATCH_CONFIRM" \
  --reason "fixture scratch preview before canonical append" > "$SCRATCH_APPLY"

VOID_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CREATED_AT="$CREATED_AT" node "$RECEIPT_TOOL" \
  --scratch-apply "$SCRATCH_APPLY" \
  --scratch-ledger "$LEDGER_OUT" \
  --out "$RECEIPT" \
  --reviewer "operator-receipt-reviewer" \
  --reason "fixture receipt binds scratch ledger preview only" >/tmp/void-scratch-receipt-closeout-receipt.out

printf '== scratch apply receipt closeout ==\n'
VOID_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_CREATED_AT="$CREATED_AT" node "$CLOSEOUT_TOOL" \
  --receipt "$RECEIPT" \
  --out "$CLOSEOUT_A" \
  --closer "operator-closeout-reviewer" \
  --reason "fixture closeout binds scratch receipt only" >/tmp/void-scratch-receipt-closeout-a.out

VOID_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_CREATED_AT="$CREATED_AT" node "$CLOSEOUT_TOOL" \
  --receipt "$RECEIPT" \
  --out "$CLOSEOUT_B" \
  --closer "operator-closeout-reviewer" \
  --reason "fixture closeout binds scratch receipt only" >/tmp/void-scratch-receipt-closeout-b.out

printf '== closeout deterministic / binding ==\n'
python3 - "$RECEIPT" "$CLOSEOUT_A" "$CLOSEOUT_B" "$MARKER" "$RECEIPT_MARKER" "$SCRATCH_APPLY_MARKER" "$EXECUTE_PACKET_MARKER" <<'PY'
import json
import pathlib
import re
import sys
receipt_path, closeout_a_path, closeout_b_path, marker, receipt_marker, scratch_marker, execute_marker = sys.argv[1:8]
receipt = json.load(open(receipt_path, encoding="utf-8"))
closeout_a_text = pathlib.Path(closeout_a_path).read_text(encoding="utf-8")
closeout_b_text = pathlib.Path(closeout_b_path).read_text(encoding="utf-8")
assert closeout_a_text == closeout_b_text
closeout = json.loads(closeout_a_text)
assert closeout["schema"] == "void.datanet.wc.evidence_packet_ledger_append_scratch_apply_receipt_closeout.v1"
assert closeout["marker"] == marker
assert closeout["status"] == "scratch_receipt_chain_closed_for_operator_review"
assert re.fullmatch(r"[0-9a-f]{64}", closeout["scratch_apply_receipt_closeout_id"])
assert closeout["closer"] == "operator-closeout-reviewer"
assert closeout["receipt"]["path"] == str(pathlib.Path(receipt_path).resolve())
assert closeout["receipt"]["marker"] == receipt_marker
assert closeout["receipt"]["scratch_apply_receipt_id"] == receipt["scratch_apply_receipt_id"]
assert closeout["scratch_apply"]["marker"] == scratch_marker
assert closeout["scratch_apply"]["scratch_apply_id"] == receipt["scratch_apply"]["scratch_apply_id"]
assert closeout["scratch_ledger"]["scratch_ledger_out_hash"] == receipt["scratch_ledger"]["scratch_ledger_out_hash"]
assert closeout["scratch_ledger"]["appended_line_hash"] == receipt["scratch_ledger"]["appended_line_hash"]
assert closeout["scratch_ledger"]["logical_candidate_next_ledger_hash"] == receipt["scratch_ledger"]["logical_candidate_next_ledger_hash"]
assert closeout["source"]["execute_packet_marker"] == execute_marker
assert closeout["source"]["execute_packet_id"] == receipt["source"]["execute_packet_id"]
assert closeout["source"]["work_id"] == "demo-datanet-verification-artifact"
assert closeout["source"]["worker"] == "local-contributor"
summary = closeout["closeout_summary"]
assert summary["scratch_receipt_chain_complete"] is True
assert summary["scratch_ledger_preview_bound"] is True
assert summary["canonical_ledger_ready_for_later_manual_operator_decision_only"] is True
assert summary["canonical_ledger_append_performed"] is False
assert summary["wc_issuance_performed"] is False
assert summary["wc_claim_performed"] is False
assert summary["actual_wc_ledger_write_performed"] is False
policy = closeout["work_credits_policy"]
assert policy["useful_verifiable_work_only"] is True
assert policy["unlimited_uncapped_accounting_units"] is True
assert policy["finite_approved_amount_for_this_review"] is True
assert policy["scratch_receipt_closeout_only"] is True
boundary = closeout["boundary"]
assert boundary["scratch_apply_receipt_closeout_only"] is True
assert boundary["scratch_apply_receipt_only_source"] is True
assert boundary["scratch_apply_only_source"] is True
assert boundary["canonical_ledger_append_performed"] is False
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
print("scratch_apply_receipt_closeout_deterministic_green=true")
print("scratch_apply_receipt_closeout_binding_green=true")
PY

printf '== bad receipt rejection ==\n'
python3 - "$RECEIPT" "$BAD_RECEIPT" <<'PY'
import json, sys
record = json.load(open(sys.argv[1], encoding="utf-8"))
record["status"] = "not_recorded"
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(record, indent=2) + "\n")
PY
if node "$CLOSEOUT_TOOL" \
  --receipt "$BAD_RECEIPT" \
  --out "$TMP_DIR/bad-receipt-closeout.json" \
  --closer "operator-closeout-reviewer" \
  --reason "bad receipt should fail" >/tmp/void-scratch-receipt-closeout-bad-receipt-out 2>/tmp/void-scratch-receipt-closeout-bad-receipt-err; then
  echo "bad_receipt_rejection_green=false"
  cat /tmp/void-scratch-receipt-closeout-bad-receipt-out
  exit 1
fi
grep -Fq "receipt_status_mismatch" /tmp/void-scratch-receipt-closeout-bad-receipt-err
echo "bad_receipt_rejection_green=true"

printf '== bad marker rejection ==\n'
python3 - "$RECEIPT" "$BAD_MARKER" <<'PY'
import json, sys
record = json.load(open(sys.argv[1], encoding="utf-8"))
record["marker"] = "VOID_BAD_MARKER"
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(record, indent=2) + "\n")
PY
if node "$CLOSEOUT_TOOL" \
  --receipt "$BAD_MARKER" \
  --out "$TMP_DIR/bad-marker-closeout.json" \
  --closer "operator-closeout-reviewer" \
  --reason "bad marker should fail" >/tmp/void-scratch-receipt-closeout-bad-marker-out 2>/tmp/void-scratch-receipt-closeout-bad-marker-err; then
  echo "bad_marker_rejection_green=false"
  cat /tmp/void-scratch-receipt-closeout-bad-marker-out
  exit 1
fi
grep -Fq "receipt_marker_mismatch" /tmp/void-scratch-receipt-closeout-bad-marker-err
echo "bad_marker_rejection_green=true"

printf '== marker/source presence ==\n'
grep -Fq "$MARKER" "$CLOSEOUT_TOOL"
grep -Fq "$MARKER" "$DOC"
grep -Fq "$MARKER" "$0"
grep -Fq "scratch apply receipt closeout" "$DOC"
grep -Fq "scratch_apply_receipt_closeout" "$CLOSEOUT_TOOL"

printf '== forbidden WC cap wording scan ==\n'
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$CLOSEOUT_TOOL" "$DOC"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

printf '== no mutation authority scan ==\n'
if grep -RInE 'privateKey|mnemonic|signTransaction|sendTransaction|canonical_ledger_append_performed[[:space:]]*:[[:space:]]*true|ledger[[:space:]_-]*append[[:space:]]*=[[:space:]]*true|ledger[[:space:]_-]*write[[:space:]]*=[[:space:]]*true|wc_ledger_write_enabled[[:space:]]*:[[:space:]]*true|wc_issuance_enabled[[:space:]]*:[[:space:]]*true|network_submit_enabled[[:space:]]*:[[:space:]]*true' "$CLOSEOUT_TOOL" "$DOC"; then
  echo "no_mutation_authority_scan_green=false"
  exit 1
fi
echo "no_mutation_authority_scan_green=true"

printf '== result ==\n'
echo "${MARKER}_GREEN"
