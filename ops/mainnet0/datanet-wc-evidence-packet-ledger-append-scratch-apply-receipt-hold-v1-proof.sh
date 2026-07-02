#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_HOLD_V1"
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
DOC="docs/datanet/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt-hold-v1.md"
SCRATCH_APPLY_PROOF="ops/mainnet0/datanet-wc-evidence-packet-ledger-append-scratch-apply-hold-v1-proof.sh"
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
RECEIPT_A="$TMP_DIR/receipt-a.json"
RECEIPT_B="$TMP_DIR/receipt-b.json"
BAD_SCRATCH_APPLY="$TMP_DIR/bad-scratch-apply.json"
BAD_LEDGER="$TMP_DIR/bad-scratch-ledger.jsonl"

CREATED_AT="2026-07-02T00:00:00.000Z"
ZERO_HASH="0000000000000000000000000000000000000000000000000000000000000000"
SCRATCH_CONFIRM="I_UNDERSTAND_THIS_WRITES_ONLY_A_SCRATCH_LEDGER_PREVIEW"
EXECUTE_CONFIRM="I_UNDERSTAND_THIS_IS_EXECUTE_PACKET_ONLY_NO_APPEND"

printf '== tools exist / syntax ==\n'
for tool in \
  "$GEN_TOOL" "$VERIFY_TOOL" "$ROUNDTRIP_TOOL" "$QUEUE_TOOL" "$DECISION_TOOL" \
  "$PROPOSAL_TOOL" "$APPROVAL_TOOL" "$LEDGER_PACKET_TOOL" "$DRY_RUN_TOOL" \
  "$EXECUTE_PACKET_TOOL" "$SCRATCH_APPLY_TOOL" "$RECEIPT_TOOL"; do
  test -x "$tool"
  node --check "$tool"
done
bash -n "$SCRATCH_APPLY_PROOF"

printf '== scratch apply source proof ==\n'
bash "$SCRATCH_APPLY_PROOF"

printf '== create scratch apply ==\n'
VOID_PACKET_CREATED_AT="$CREATED_AT" node "$ROUNDTRIP_TOOL" \
  --input "$FIXTURE_DIR" \
  --packet-out "$PACKET" \
  --work-id "demo-datanet-verification-artifact" \
  --worker "local-contributor" \
  --reviewer "operator-review-required" \
  --verify-out "$VERIFY_OUT" \
  --summary-out "$SUMMARY" >/tmp/void-scratch-receipt-roundtrip.out

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
  --reason "fixture evidence packet verified and ready for separate award review" >/tmp/void-scratch-receipt-decision.out

VOID_AWARD_PROPOSAL_CREATED_AT="$CREATED_AT" node "$PROPOSAL_TOOL" \
  --decision "$DECISION_ACCEPT" \
  --out "$PROPOSAL" \
  --proposer "operator-reviewer" \
  --proposed-wc "100" \
  --reason "fixture verified useful DataNet evidence packet" >/tmp/void-scratch-receipt-proposal.out

VOID_AWARD_APPROVAL_CREATED_AT="$CREATED_AT" node "$APPROVAL_TOOL" \
  --proposal "$PROPOSAL" \
  --out "$APPROVAL_OK" \
  --approver "operator-approver" \
  --decision "approve_award" \
  --reason "fixture award proposal approved for separate ledger write review" >/tmp/void-scratch-receipt-approval.out

VOID_LEDGER_WRITE_PACKET_CREATED_AT="$CREATED_AT" node "$LEDGER_PACKET_TOOL" \
  --approval "$APPROVAL_OK" \
  --out "$LEDGER_PACKET" \
  --operator "operator-ledger-preparer" \
  --ledger "datanet-wc-awards" \
  --reason "fixture ready for separate operator ledger append review" >/tmp/void-scratch-receipt-ledger-packet.out

VOID_LEDGER_APPEND_DRY_RUN_CREATED_AT="$CREATED_AT" node "$DRY_RUN_TOOL" \
  --packet "$LEDGER_PACKET" \
  --out "$DRY_RUN" \
  --operator "operator-ledger-preparer" \
  --ledger-current-hash "$ZERO_HASH" \
  --reason "fixture dry-run before separate operator append" >/tmp/void-scratch-receipt-dry-run.out

VOID_LEDGER_APPEND_EXECUTE_PACKET_CREATED_AT="$CREATED_AT" node "$EXECUTE_PACKET_TOOL" \
  --dry-run "$DRY_RUN" \
  --out "$EXECUTE_PACKET" \
  --operator "operator-ledger-preparer" \
  --execution-mode "manual_operator_append_review" \
  --confirm "$EXECUTE_CONFIRM" \
  --reason "fixture ready for separate manual append execution" >/tmp/void-scratch-receipt-execute-packet.out

: > "$LEDGER_IN"
VOID_LEDGER_APPEND_SCRATCH_APPLY_CREATED_AT="$CREATED_AT" node "$SCRATCH_APPLY_TOOL" \
  --execute-packet "$EXECUTE_PACKET" \
  --ledger-in "$LEDGER_IN" \
  --ledger-out "$LEDGER_OUT" \
  --operator "operator-ledger-preparer" \
  --confirm "$SCRATCH_CONFIRM" \
  --reason "fixture scratch preview before canonical append" > "$SCRATCH_APPLY"

printf '== scratch apply receipt ==\n'
VOID_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CREATED_AT="$CREATED_AT" node "$RECEIPT_TOOL" \
  --scratch-apply "$SCRATCH_APPLY" \
  --scratch-ledger "$LEDGER_OUT" \
  --out "$RECEIPT_A" \
  --reviewer "operator-receipt-reviewer" \
  --reason "fixture receipt binds scratch ledger preview only" >/tmp/void-scratch-receipt-a.out

VOID_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CREATED_AT="$CREATED_AT" node "$RECEIPT_TOOL" \
  --scratch-apply "$SCRATCH_APPLY" \
  --scratch-ledger "$LEDGER_OUT" \
  --out "$RECEIPT_B" \
  --reviewer "operator-receipt-reviewer" \
  --reason "fixture receipt binds scratch ledger preview only" >/tmp/void-scratch-receipt-b.out

printf '== receipt deterministic / binding ==\n'
python3 - "$SCRATCH_APPLY" "$LEDGER_OUT" "$RECEIPT_A" "$RECEIPT_B" "$MARKER" "$SCRATCH_APPLY_MARKER" "$EXECUTE_PACKET_MARKER" <<'PY'
import hashlib
import json
import pathlib
import re
import sys
scratch_path, ledger_path, receipt_a_path, receipt_b_path, marker, scratch_marker, execute_marker = sys.argv[1:8]
scratch = json.load(open(scratch_path, encoding="utf-8"))
receipt_a_text = pathlib.Path(receipt_a_path).read_text(encoding="utf-8")
receipt_b_text = pathlib.Path(receipt_b_path).read_text(encoding="utf-8")
assert receipt_a_text == receipt_b_text
receipt = json.loads(receipt_a_text)
ledger_bytes = pathlib.Path(ledger_path).read_bytes()
ledger_hash = hashlib.sha256(ledger_bytes).hexdigest()
ledger_lines = [line for line in ledger_bytes.decode("utf-8").split("\n") if line.strip()]
last_line = json.loads(ledger_lines[-1])
assert receipt["schema"] == "void.datanet.wc.evidence_packet_ledger_append_scratch_apply_receipt.v1"
assert receipt["marker"] == marker
assert receipt["status"] == "scratch_ledger_preview_receipt_recorded"
assert re.fullmatch(r"[0-9a-f]{64}", receipt["scratch_apply_receipt_id"])
assert receipt["reviewer"] == "operator-receipt-reviewer"
assert receipt["scratch_apply"]["marker"] == scratch_marker
assert receipt["scratch_apply"]["scratch_apply_id"] == scratch["scratch_apply_id"]
assert receipt["scratch_ledger"]["path"] == str(pathlib.Path(ledger_path).resolve())
assert receipt["scratch_ledger"]["line_count"] == len(ledger_lines) == 1
assert receipt["scratch_ledger"]["scratch_ledger_out_hash"] == ledger_hash == scratch["scratch_ledger_out_hash"]
assert receipt["scratch_ledger"]["appended_line_hash"] == scratch["appended_line_hash"]
assert receipt["scratch_ledger"]["logical_candidate_next_ledger_hash"] == scratch["logical_candidate_next_ledger_hash"]
assert receipt["scratch_ledger"]["last_line"] == last_line == scratch["appended_line"]
source = receipt["source"]
assert source["execute_packet_marker"] == execute_marker
assert source["execute_packet_id"] == scratch["source"]["execute_packet_id"]
assert source["work_id"] == "demo-datanet-verification-artifact"
assert source["worker"] == "local-contributor"
assert source["files"] == 2
policy = receipt["work_credits_policy"]
assert policy["useful_verifiable_work_only"] is True
assert policy["unlimited_uncapped_accounting_units"] is True
assert policy["finite_approved_amount_for_this_review"] is True
assert policy["scratch_receipt_only"] is True
boundary = receipt["boundary"]
assert boundary["scratch_apply_receipt_only"] is True
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
print("scratch_apply_receipt_deterministic_green=true")
print("scratch_apply_receipt_binding_green=true")
PY

printf '== bad scratch apply rejection ==\n'
python3 - "$SCRATCH_APPLY" "$BAD_SCRATCH_APPLY" <<'PY'
import json, sys
record = json.load(open(sys.argv[1], encoding="utf-8"))
record["status"] = "not_written"
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(record, indent=2) + "\n")
PY
if node "$RECEIPT_TOOL" \
  --scratch-apply "$BAD_SCRATCH_APPLY" \
  --scratch-ledger "$LEDGER_OUT" \
  --out "$TMP_DIR/bad-scratch-receipt.json" \
  --reviewer "operator-receipt-reviewer" \
  --reason "bad scratch apply should fail" >/tmp/void-scratch-receipt-bad-apply-out 2>/tmp/void-scratch-receipt-bad-apply-err; then
  echo "bad_scratch_apply_rejection_green=false"
  cat /tmp/void-scratch-receipt-bad-apply-out
  exit 1
fi
grep -Fq "scratch_apply_status_mismatch" /tmp/void-scratch-receipt-bad-apply-err
echo "bad_scratch_apply_rejection_green=true"

printf '== bad scratch ledger rejection ==\n'
cp "$LEDGER_OUT" "$BAD_LEDGER"
python3 - "$LEDGER_OUT" <<'PY'
import json, sys
line = json.loads(open(sys.argv[1], encoding="utf-8").read().strip())
line["approved_wc_amount"] = "101"
open(sys.argv[1], "w", encoding="utf-8").write(json.dumps(line) + "\n")
PY
if node "$RECEIPT_TOOL" \
  --scratch-apply "$SCRATCH_APPLY" \
  --scratch-ledger "$LEDGER_OUT" \
  --out "$TMP_DIR/bad-ledger-receipt.json" \
  --reviewer "operator-receipt-reviewer" \
  --reason "bad scratch ledger should fail" >/tmp/void-scratch-receipt-bad-ledger-out 2>/tmp/void-scratch-receipt-bad-ledger-err; then
  echo "bad_scratch_ledger_rejection_green=false"
  cat /tmp/void-scratch-receipt-bad-ledger-out
  exit 1
fi
grep -Fq "scratch_ledger_hash_mismatch" /tmp/void-scratch-receipt-bad-ledger-err
mv "$BAD_LEDGER" "$LEDGER_OUT"
echo "bad_scratch_ledger_rejection_green=true"

printf '== marker/source presence ==\n'
grep -Fq "$MARKER" "$RECEIPT_TOOL"
grep -Fq "$MARKER" "$DOC"
grep -Fq "$MARKER" "$0"
grep -Fq "scratch apply receipt" "$DOC"
grep -Fq "scratch_apply_receipt" "$RECEIPT_TOOL"

printf '== forbidden WC cap wording scan ==\n'
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$RECEIPT_TOOL" "$DOC"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

printf '== no mutation authority scan ==\n'
if grep -RInE 'privateKey|mnemonic|signTransaction|sendTransaction|canonical_ledger_append_performed[[:space:]]*:[[:space:]]*true|ledger[[:space:]_-]*append[[:space:]]*=[[:space:]]*true|ledger[[:space:]_-]*write[[:space:]]*=[[:space:]]*true|wc_ledger_write_enabled[[:space:]]*:[[:space:]]*true|wc_issuance_enabled[[:space:]]*:[[:space:]]*true|network_submit_enabled[[:space:]]*:[[:space:]]*true' "$RECEIPT_TOOL" "$DOC"; then
  echo "no_mutation_authority_scan_green=false"
  exit 1
fi
echo "no_mutation_authority_scan_green=true"

printf '== result ==\n'
echo "${MARKER}_GREEN"
