#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1"
FINAL_SEAL_INDEX_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1"
INDEX_CLOSEOUT_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_HOLD_V1"
REVIEW_INDEX_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_HOLD_V1"
CLOSEOUT_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_HOLD_V1"
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
REVIEW_INDEX_TOOL="tools/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt-closeout-review-index.mjs"
INDEX_CLOSEOUT_TOOL="tools/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt-closeout-review-index-closeout.mjs"
FINAL_SEAL_INDEX_TOOL="tools/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt-closeout-review-index-closeout-final-seal-index.mjs"
FINAL_SEAL_INDEX_CLOSEOUT_TOOL="tools/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt-closeout-review-index-closeout-final-seal-index-closeout.mjs"
DOC="docs/datanet/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt-closeout-review-index-closeout-final-seal-index-closeout-hold-v1.md"
PREV_PROOF="ops/mainnet0/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt-closeout-review-index-closeout-final-seal-index-hold-v1-proof.sh"
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
CLOSEOUT="$TMP_DIR/closeout.json"
REVIEW_INDEX="$TMP_DIR/review-index.json"
INDEX_CLOSEOUT="$TMP_DIR/review-index-closeout.json"
FINAL_SEAL_INDEX="$TMP_DIR/final-seal-index.json"
FINAL_SEAL_INDEX_CLOSEOUT_A="$TMP_DIR/final-seal-index-closeout-a.json"
FINAL_SEAL_INDEX_CLOSEOUT_B="$TMP_DIR/final-seal-index-closeout-b.json"
BAD_FINAL_SEAL_INDEX="$TMP_DIR/bad-final-seal-index.json"
BAD_MARKER="$TMP_DIR/bad-marker-final-seal-index.json"

CREATED_AT="2026-07-02T00:00:00.000Z"
ZERO_HASH="0000000000000000000000000000000000000000000000000000000000000000"
SCRATCH_CONFIRM="I_UNDERSTAND_THIS_WRITES_ONLY_A_SCRATCH_LEDGER_PREVIEW"
EXECUTE_CONFIRM="I_UNDERSTAND_THIS_IS_EXECUTE_PACKET_ONLY_NO_APPEND"

printf '== tools exist / syntax ==\n'
for tool in \
  "$GEN_TOOL" "$VERIFY_TOOL" "$ROUNDTRIP_TOOL" "$QUEUE_TOOL" "$DECISION_TOOL" \
  "$PROPOSAL_TOOL" "$APPROVAL_TOOL" "$LEDGER_PACKET_TOOL" "$DRY_RUN_TOOL" \
  "$EXECUTE_PACKET_TOOL" "$SCRATCH_APPLY_TOOL" "$RECEIPT_TOOL" "$CLOSEOUT_TOOL" \
  "$REVIEW_INDEX_TOOL" "$INDEX_CLOSEOUT_TOOL" "$FINAL_SEAL_INDEX_TOOL" "$FINAL_SEAL_INDEX_CLOSEOUT_TOOL"; do
  test -x "$tool"
  node --check "$tool"
done
bash -n "$PREV_PROOF"

printf '== scratch apply receipt closeout review index closeout final seal index source proof ==\n'
bash "$PREV_PROOF"

printf '== create scratch apply receipt closeout review index closeout final seal index ==\n'
VOID_PACKET_CREATED_AT="$CREATED_AT" node "$ROUNDTRIP_TOOL" \
  --input "$FIXTURE_DIR" \
  --packet-out "$PACKET" \
  --work-id "demo-datanet-verification-artifact" \
  --worker "local-contributor" \
  --reviewer "operator-review-required" \
  --verify-out "$VERIFY_OUT" \
  --summary-out "$SUMMARY" >/tmp/void-final-seal-index-closeout-roundtrip.out

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
  --reason "fixture evidence packet verified and ready for separate award review" >/tmp/void-final-seal-index-closeout-decision.out

VOID_AWARD_PROPOSAL_CREATED_AT="$CREATED_AT" node "$PROPOSAL_TOOL" \
  --decision "$DECISION_ACCEPT" \
  --out "$PROPOSAL" \
  --proposer "operator-reviewer" \
  --proposed-wc "100" \
  --reason "fixture verified useful DataNet evidence packet" >/tmp/void-final-seal-index-closeout-proposal.out

VOID_AWARD_APPROVAL_CREATED_AT="$CREATED_AT" node "$APPROVAL_TOOL" \
  --proposal "$PROPOSAL" \
  --out "$APPROVAL_OK" \
  --approver "operator-approver" \
  --decision "approve_award" \
  --reason "fixture award proposal approved for separate ledger write review" >/tmp/void-final-seal-index-closeout-approval.out

VOID_LEDGER_WRITE_PACKET_CREATED_AT="$CREATED_AT" node "$LEDGER_PACKET_TOOL" \
  --approval "$APPROVAL_OK" \
  --out "$LEDGER_PACKET" \
  --operator "operator-ledger-preparer" \
  --ledger "datanet-wc-awards" \
  --reason "fixture ready for separate operator ledger append review" >/tmp/void-final-seal-index-closeout-ledger-packet.out

VOID_LEDGER_APPEND_DRY_RUN_CREATED_AT="$CREATED_AT" node "$DRY_RUN_TOOL" \
  --packet "$LEDGER_PACKET" \
  --out "$DRY_RUN" \
  --operator "operator-ledger-preparer" \
  --ledger-current-hash "$ZERO_HASH" \
  --reason "fixture dry-run before separate operator append" >/tmp/void-final-seal-index-closeout-dry-run.out

VOID_LEDGER_APPEND_EXECUTE_PACKET_CREATED_AT="$CREATED_AT" node "$EXECUTE_PACKET_TOOL" \
  --dry-run "$DRY_RUN" \
  --out "$EXECUTE_PACKET" \
  --operator "operator-ledger-preparer" \
  --execution-mode "manual_operator_append_review" \
  --confirm "$EXECUTE_CONFIRM" \
  --reason "fixture ready for separate manual append execution" >/tmp/void-final-seal-index-closeout-execute-packet.out

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
  --reason "fixture receipt binds scratch ledger preview only" >/tmp/void-final-seal-index-closeout-receipt.out

VOID_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_CREATED_AT="$CREATED_AT" node "$CLOSEOUT_TOOL" \
  --receipt "$RECEIPT" \
  --out "$CLOSEOUT" \
  --closer "operator-closeout-reviewer" \
  --reason "fixture closeout binds scratch receipt only" >/tmp/void-final-seal-index-closeout-closeout.out

VOID_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CREATED_AT="$CREATED_AT" node "$REVIEW_INDEX_TOOL" \
  --closeout "$CLOSEOUT" \
  --out "$REVIEW_INDEX" \
  --indexer "operator-review-indexer" \
  --reason "fixture index binds scratch closeout only" >/tmp/void-final-seal-index-closeout-review-index.out

VOID_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_CREATED_AT="$CREATED_AT" node "$INDEX_CLOSEOUT_TOOL" \
  --review-index "$REVIEW_INDEX" \
  --out "$INDEX_CLOSEOUT" \
  --closer "operator-review-closeout" \
  --reason "fixture closeout binds review index only" >/tmp/void-final-seal-index-closeout-index-closeout.out

VOID_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_CREATED_AT="$CREATED_AT" node "$FINAL_SEAL_INDEX_TOOL" \
  --review-index-closeout "$INDEX_CLOSEOUT" \
  --out "$FINAL_SEAL_INDEX" \
  --indexer "operator-final-seal-indexer" \
  --reason "fixture final seal index binds review index closeout only" >/tmp/void-final-seal-index-closeout-final-seal-index.out

printf '== scratch apply receipt closeout review index closeout final seal index closeout ==\n'
VOID_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_CREATED_AT="$CREATED_AT" node "$FINAL_SEAL_INDEX_CLOSEOUT_TOOL" \
  --final-seal-index "$FINAL_SEAL_INDEX" \
  --out "$FINAL_SEAL_INDEX_CLOSEOUT_A" \
  --closer "operator-final-seal-closeout" \
  --reason "fixture closeout binds final seal index only" >/tmp/void-final-seal-index-closeout-a.out

VOID_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_CREATED_AT="$CREATED_AT" node "$FINAL_SEAL_INDEX_CLOSEOUT_TOOL" \
  --final-seal-index "$FINAL_SEAL_INDEX" \
  --out "$FINAL_SEAL_INDEX_CLOSEOUT_B" \
  --closer "operator-final-seal-closeout" \
  --reason "fixture closeout binds final seal index only" >/tmp/void-final-seal-index-closeout-b.out

printf '== final seal index closeout deterministic / binding ==\n'
python3 - "$FINAL_SEAL_INDEX" "$FINAL_SEAL_INDEX_CLOSEOUT_A" "$FINAL_SEAL_INDEX_CLOSEOUT_B" "$MARKER" "$FINAL_SEAL_INDEX_MARKER" "$INDEX_CLOSEOUT_MARKER" "$REVIEW_INDEX_MARKER" "$CLOSEOUT_MARKER" "$RECEIPT_MARKER" "$SCRATCH_APPLY_MARKER" "$EXECUTE_PACKET_MARKER" <<'PY'
import json
import pathlib
import re
import sys
(final_index_path, closeout_a_path, closeout_b_path, marker, final_marker, index_closeout_marker, review_index_marker, closeout_marker, receipt_marker, scratch_marker, execute_marker) = sys.argv[1:12]
final_index = json.load(open(final_index_path, encoding="utf-8"))
text_a = pathlib.Path(closeout_a_path).read_text(encoding="utf-8")
text_b = pathlib.Path(closeout_b_path).read_text(encoding="utf-8")
assert text_a == text_b
record = json.loads(text_a)
assert record["schema"] == "void.datanet.wc.evidence_packet_ledger_append_scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout.v1"
assert record["marker"] == marker
assert record["status"] == "scratch_preview_review_index_closeout_final_seal_index_closed_for_operator_review"
assert re.fullmatch(r"[0-9a-f]{64}", record["scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id"])
assert record["closer"] == "operator-final-seal-closeout"
assert record["final_seal_index"]["path"] == str(pathlib.Path(final_index_path).resolve())
assert record["final_seal_index"]["marker"] == final_marker
assert record["final_seal_index"]["scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_id"] == final_index["scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_id"]
assert record["review_index_closeout"]["marker"] == index_closeout_marker
assert record["review_index_closeout"]["scratch_apply_receipt_closeout_review_index_closeout_id"] == final_index["review_index_closeout"]["scratch_apply_receipt_closeout_review_index_closeout_id"]
assert record["review_index"]["marker"] == review_index_marker
assert record["review_index"]["scratch_apply_receipt_closeout_review_index_id"] == final_index["review_index"]["scratch_apply_receipt_closeout_review_index_id"]
assert record["closeout"]["marker"] == closeout_marker
assert record["closeout"]["scratch_apply_receipt_closeout_id"] == final_index["closeout"]["scratch_apply_receipt_closeout_id"]
assert record["receipt"]["marker"] == receipt_marker
assert record["receipt"]["scratch_apply_receipt_id"] == final_index["receipt"]["scratch_apply_receipt_id"]
assert record["scratch_apply"]["marker"] == scratch_marker
assert record["scratch_apply"]["scratch_apply_id"] == final_index["scratch_apply"]["scratch_apply_id"]
assert record["scratch_ledger"]["scratch_ledger_out_hash"] == final_index["scratch_ledger"]["scratch_ledger_out_hash"]
assert record["scratch_ledger"]["appended_line_hash"] == final_index["scratch_ledger"]["appended_line_hash"]
assert record["scratch_ledger"]["logical_candidate_next_ledger_hash"] == final_index["scratch_ledger"]["logical_candidate_next_ledger_hash"]
assert record["source"]["execute_packet_marker"] == execute_marker
assert record["source"]["execute_packet_id"] == final_index["source"]["execute_packet_id"]
summary = record["closeout_summary"]
assert summary["scratch_review_index_closeout_final_seal_index_bound"] is True
assert summary["scratch_preview_chain_final_seal_index_closed_for_operator_review"] is True
assert summary["operator_review_final_seal_index_closeout_only"] is True
assert summary["canonical_ledger_ready_for_later_manual_operator_decision_only"] is True
assert summary["canonical_ledger_append_performed"] is False
assert summary["wc_issuance_performed"] is False
assert summary["wc_claim_performed"] is False
assert summary["actual_wc_ledger_write_performed"] is False
policy = record["work_credits_policy"]
assert policy["useful_verifiable_work_only"] is True
assert policy["unlimited_uncapped_accounting_units"] is True
assert policy["finite_approved_amount_for_this_review"] is True
assert policy["scratch_review_index_closeout_final_seal_index_closeout_only"] is True
boundary = record["boundary"]
assert boundary["scratch_review_index_closeout_final_seal_index_closeout_only"] is True
assert boundary["scratch_review_index_closeout_final_seal_index_only_source"] is True
assert boundary["scratch_apply_receipt_closeout_review_index_closeout_only_source"] is True
assert boundary["scratch_apply_receipt_closeout_review_index_only_source"] is True
assert boundary["scratch_apply_receipt_closeout_only_source"] is True
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
print("scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_deterministic_green=true")
print("scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_binding_green=true")
PY

printf '== bad final seal index rejection ==\n'
python3 - "$FINAL_SEAL_INDEX" "$BAD_FINAL_SEAL_INDEX" <<'PY'
import json, sys
record = json.load(open(sys.argv[1], encoding="utf-8"))
record["status"] = "not_final_sealed"
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(record, indent=2) + "\n")
PY
if node "$FINAL_SEAL_INDEX_CLOSEOUT_TOOL" \
  --final-seal-index "$BAD_FINAL_SEAL_INDEX" \
  --out "$TMP_DIR/bad-final-seal-index-closeout.json" \
  --closer "operator-final-seal-closeout" \
  --reason "bad final seal index should fail" >/tmp/void-final-seal-index-closeout-bad-final-out 2>/tmp/void-final-seal-index-closeout-bad-final-err; then
  echo "bad_final_seal_index_rejection_green=false"
  cat /tmp/void-final-seal-index-closeout-bad-final-out
  exit 1
fi
grep -Fq "final_seal_index_status_mismatch" /tmp/void-final-seal-index-closeout-bad-final-err
echo "bad_final_seal_index_rejection_green=true"

printf '== bad marker rejection ==\n'
python3 - "$FINAL_SEAL_INDEX" "$BAD_MARKER" <<'PY'
import json, sys
record = json.load(open(sys.argv[1], encoding="utf-8"))
record["marker"] = "VOID_BAD_MARKER"
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(record, indent=2) + "\n")
PY
if node "$FINAL_SEAL_INDEX_CLOSEOUT_TOOL" \
  --final-seal-index "$BAD_MARKER" \
  --out "$TMP_DIR/bad-marker-final-seal-index-closeout.json" \
  --closer "operator-final-seal-closeout" \
  --reason "bad marker should fail" >/tmp/void-final-seal-index-closeout-bad-marker-out 2>/tmp/void-final-seal-index-closeout-bad-marker-err; then
  echo "bad_marker_rejection_green=false"
  cat /tmp/void-final-seal-index-closeout-bad-marker-out
  exit 1
fi
grep -Fq "final_seal_index_marker_mismatch" /tmp/void-final-seal-index-closeout-bad-marker-err
echo "bad_marker_rejection_green=true"

printf '== marker/source presence ==\n'
grep -Fq "$MARKER" "$FINAL_SEAL_INDEX_CLOSEOUT_TOOL"
grep -Fq "$MARKER" "$DOC"
grep -Fq "$MARKER" "$0"
grep -Fq "final seal index closeout" "$DOC"
grep -Fq "scratch_review_index_closeout_final_seal_index_closeout" "$FINAL_SEAL_INDEX_CLOSEOUT_TOOL"

printf '== forbidden WC cap wording scan ==\n'
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$FINAL_SEAL_INDEX_CLOSEOUT_TOOL" "$DOC"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

printf '== no mutation authority scan ==\n'
if grep -RInE 'privateKey|mnemonic|signTransaction|sendTransaction|canonical_ledger_append_performed[[:space:]]*:[[:space:]]*true|ledger[[:space:]_-]*append[[:space:]]*=[[:space:]]*true|ledger[[:space:]_-]*write[[:space:]]*=[[:space:]]*true|wc_ledger_write_enabled[[:space:]]*:[[:space:]]*true|wc_issuance_enabled[[:space:]]*:[[:space:]]*true|network_submit_enabled[[:space:]]*:[[:space:]]*true' "$FINAL_SEAL_INDEX_CLOSEOUT_TOOL" "$DOC"; then
  echo "no_mutation_authority_scan_green=false"
  exit 1
fi
echo "no_mutation_authority_scan_green=true"

printf '== result ==\n'
echo "${MARKER}_GREEN"
