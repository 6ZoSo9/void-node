#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_HOLD_V1"
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

DOC="docs/datanet/datanet-wc-evidence-packet-ledger-append-scratch-apply-hold-v1.md"
EXECUTE_PACKET_PROOF="ops/mainnet0/datanet-wc-evidence-packet-ledger-append-execute-packet-hold-v1-proof.sh"
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
LEDGER_OUT_B="$TMP_DIR/scratch-ledger-out-b.jsonl"
SCRATCH_OUT_A="$TMP_DIR/scratch-out-a.json"
SCRATCH_OUT_B="$TMP_DIR/scratch-out-b.json"
BAD_EXEC="$TMP_DIR/bad-execute-packet.json"
CREATED_AT="2026-07-02T00:00:00.000Z"
ZERO_HASH="0000000000000000000000000000000000000000000000000000000000000000"
CONFIRM="I_UNDERSTAND_THIS_WRITES_ONLY_A_SCRATCH_LEDGER_PREVIEW"

echo "== tools exist / syntax =="
for tool in "$GEN_TOOL" "$VERIFY_TOOL" "$ROUNDTRIP_TOOL" "$QUEUE_TOOL" "$DECISION_TOOL" "$PROPOSAL_TOOL" "$APPROVAL_TOOL" "$LEDGER_PACKET_TOOL" "$DRY_RUN_TOOL" "$EXECUTE_PACKET_TOOL" "$SCRATCH_APPLY_TOOL"; do
  test -x "$tool"
  node --check "$tool"
done

echo "== execute packet source proof =="
bash "$EXECUTE_PACKET_PROOF"

echo "== create execute packet =="
VOID_PACKET_CREATED_AT="$CREATED_AT" node "$ROUNDTRIP_TOOL" \
  --input "$FIXTURE_DIR" \
  --packet-out "$PACKET" \
  --work-id "demo-datanet-verification-artifact" \
  --worker "local-contributor" \
  --reviewer "operator-review-required" \
  --verify-out "$VERIFY_OUT" \
  --summary-out "$SUMMARY" >/tmp/void-scratch-apply-roundtrip.out

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
  --reason "fixture evidence packet verified and ready for separate award review" >/tmp/void-scratch-apply-decision.out

VOID_AWARD_PROPOSAL_CREATED_AT="$CREATED_AT" node "$PROPOSAL_TOOL" \
  --decision "$DECISION_ACCEPT" \
  --out "$PROPOSAL" \
  --proposer "operator-reviewer" \
  --proposed-wc "100" \
  --reason "fixture verified useful DataNet evidence packet" >/tmp/void-scratch-apply-proposal.out

VOID_AWARD_APPROVAL_CREATED_AT="$CREATED_AT" node "$APPROVAL_TOOL" \
  --proposal "$PROPOSAL" \
  --out "$APPROVAL_OK" \
  --approver "operator-approver" \
  --decision "approve_award" \
  --reason "fixture award proposal approved for separate ledger write review" >/tmp/void-scratch-apply-approval.out

VOID_LEDGER_WRITE_PACKET_CREATED_AT="$CREATED_AT" node "$LEDGER_PACKET_TOOL" \
  --approval "$APPROVAL_OK" \
  --out "$LEDGER_PACKET" \
  --operator "operator-ledger-preparer" \
  --ledger "datanet-wc-awards" \
  --reason "fixture ready for separate operator ledger append review" >/tmp/void-scratch-apply-ledger-packet.out

VOID_LEDGER_APPEND_DRY_RUN_CREATED_AT="$CREATED_AT" node "$DRY_RUN_TOOL" \
  --packet "$LEDGER_PACKET" \
  --out "$DRY_RUN" \
  --operator "operator-ledger-preparer" \
  --ledger-current-hash "$ZERO_HASH" \
  --reason "fixture dry-run before separate operator append" >/tmp/void-scratch-apply-dry-run.out

VOID_LEDGER_APPEND_EXECUTE_PACKET_CREATED_AT="$CREATED_AT" node "$EXECUTE_PACKET_TOOL" \
  --dry-run "$DRY_RUN" \
  --out "$EXECUTE_PACKET" \
  --operator "operator-ledger-preparer" \
  --execution-mode "manual_operator_append_review" \
  --confirm "I_UNDERSTAND_THIS_IS_EXECUTE_PACKET_ONLY_NO_APPEND" \
  --reason "fixture ready for separate manual append execution" >/tmp/void-scratch-apply-execute-packet.out

: > "$LEDGER_IN"

echo "== scratch apply =="
VOID_LEDGER_APPEND_SCRATCH_APPLY_CREATED_AT="$CREATED_AT" node "$SCRATCH_APPLY_TOOL" \
  --execute-packet "$EXECUTE_PACKET" \
  --ledger-in "$LEDGER_IN" \
  --ledger-out "$LEDGER_OUT" \
  --operator "operator-ledger-preparer" \
  --confirm "$CONFIRM" \
  --reason "fixture scratch preview before canonical append" > "$SCRATCH_OUT_A"

VOID_LEDGER_APPEND_SCRATCH_APPLY_CREATED_AT="$CREATED_AT" node "$SCRATCH_APPLY_TOOL" \
  --execute-packet "$EXECUTE_PACKET" \
  --ledger-in "$LEDGER_IN" \
  --ledger-out "$LEDGER_OUT_B" \
  --operator "operator-ledger-preparer" \
  --confirm "$CONFIRM" \
  --reason "fixture scratch preview before canonical append" > "$SCRATCH_OUT_B"

echo "== scratch apply binding =="
python3 - "$EXECUTE_PACKET" "$LEDGER_IN" "$LEDGER_OUT" "$LEDGER_OUT_B" "$SCRATCH_OUT_A" "$SCRATCH_OUT_B" "$MARKER" "$EXECUTE_PACKET_MARKER" "$ZERO_HASH" <<'PY'
import hashlib
import json
import pathlib
import re
import sys

execute_path, ledger_in_path, ledger_out_path, ledger_out_b_path, out_a_path, out_b_path, marker, execute_marker, zero_hash = sys.argv[1:10]

execute_packet = json.load(open(execute_path, encoding="utf-8"))
out_a = json.load(open(out_a_path, encoding="utf-8"))
out_b = json.load(open(out_b_path, encoding="utf-8"))
ledger_text = pathlib.Path(ledger_out_path).read_text(encoding="utf-8")
ledger_text_b = pathlib.Path(ledger_out_b_path).read_text(encoding="utf-8")

assert ledger_text == ledger_text_b
assert out_a["scratch_apply_id"] != ""
assert out_a["marker"] == marker
assert out_a["status"] == "scratch_ledger_preview_written"
assert out_a["operator"] == "operator-ledger-preparer"
assert out_a["ledger_in_path"] == str(pathlib.Path(ledger_in_path).resolve())
assert out_a["ledger_out_path"] == str(pathlib.Path(ledger_out_path).resolve())
assert out_b["ledger_out_path"] == str(pathlib.Path(ledger_out_b_path).resolve())
assert out_a["scratch_ledger_out_hash"] == out_b["scratch_ledger_out_hash"]
assert out_a["current_scratch_ledger_hash"] == zero_hash
assert out_a["logical_candidate_next_ledger_hash"] == execute_packet["append_execution_intent"]["candidate_next_ledger_hash"]
assert out_a["appended_line_hash"] == execute_packet["append_execution_intent"]["candidate_line_hash"]
assert re.fullmatch(r"[0-9a-f]{64}", out_a["scratch_ledger_out_hash"])

line = json.loads(ledger_text.strip())
assert line == execute_packet["append_execution_intent"]["candidate_line"]
assert hashlib.sha256(ledger_text.encode()).hexdigest() == out_a["scratch_ledger_out_hash"]

source = out_a["source"]
assert source["execute_packet_marker"] == execute_marker
assert source["execute_packet_id"] == execute_packet["execute_packet_id"]
assert source["worker"] == "local-contributor"
assert source["work_id"] == "demo-datanet-verification-artifact"
assert source["files"] == 2

policy = out_a["work_credits_policy"]
assert policy["useful_verifiable_work_only"] is True
assert policy["unlimited_uncapped_accounting_units"] is True
assert policy["finite_approved_amount_for_this_review"] is True
assert policy["scratch_preview_only"] is True

boundary = out_a["boundary"]
assert boundary["scratch_apply_only"] is True
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

print("scratch_apply_binding_green=true")
PY

echo "== confirm rejection =="
if node "$SCRATCH_APPLY_TOOL" \
  --execute-packet "$EXECUTE_PACKET" \
  --ledger-in "$LEDGER_IN" \
  --ledger-out "$TMP_DIR/bad-confirm-ledger.jsonl" \
  --operator "operator-ledger-preparer" \
  --confirm "WRONG" \
  --reason "bad confirm should fail" >/tmp/void-scratch-bad-confirm-out 2>/tmp/void-scratch-bad-confirm-err; then
  echo "confirm_rejection_green=false"; cat /tmp/void-scratch-bad-confirm-out; exit 1
fi
grep -Fq "confirm_phrase_mismatch" /tmp/void-scratch-bad-confirm-err
echo "confirm_rejection_green=true"

echo "== same path rejection =="
if node "$SCRATCH_APPLY_TOOL" \
  --execute-packet "$EXECUTE_PACKET" \
  --ledger-in "$LEDGER_IN" \
  --ledger-out "$LEDGER_IN" \
  --operator "operator-ledger-preparer" \
  --confirm "$CONFIRM" \
  --reason "same path should fail" >/tmp/void-scratch-same-path-out 2>/tmp/void-scratch-same-path-err; then
  echo "same_path_rejection_green=false"; cat /tmp/void-scratch-same-path-out; exit 1
fi
grep -Fq "ledger_out_must_differ_from_ledger_in" /tmp/void-scratch-same-path-err
echo "same_path_rejection_green=true"

echo "== bad execute packet rejection =="
python3 - "$EXECUTE_PACKET" "$BAD_EXEC" <<'PY'
import json, sys
packet = json.load(open(sys.argv[1], encoding="utf-8"))
packet["status"] = "not_recorded"
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(packet, indent=2) + "\n")
PY

if node "$SCRATCH_APPLY_TOOL" \
  --execute-packet "$BAD_EXEC" \
  --ledger-in "$LEDGER_IN" \
  --ledger-out "$TMP_DIR/bad-exec-ledger.jsonl" \
  --operator "operator-ledger-preparer" \
  --confirm "$CONFIRM" \
  --reason "bad execute should fail" >/tmp/void-scratch-bad-exec-out 2>/tmp/void-scratch-bad-exec-err; then
  echo "bad_execute_packet_rejection_green=false"; cat /tmp/void-scratch-bad-exec-out; exit 1
fi
grep -Fq "execute_packet_status_mismatch" /tmp/void-scratch-bad-exec-err
echo "bad_execute_packet_rejection_green=true"

echo "== marker/source presence =="
grep -Fq "$MARKER" "$SCRATCH_APPLY_TOOL"
grep -Fq "$MARKER" "$DOC"
grep -Fq "$MARKER" "$0"

echo "== forbidden WC cap wording scan =="
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$SCRATCH_APPLY_TOOL" "$DOC"; then
  echo "forbidden_wc_cap_scan_green=false"; exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== no mutation authority scan =="
if grep -RInE 'privateKey|mnemonic|signTransaction|sendTransaction|canonical_ledger_append_performed[[:space:]]*:[[:space:]]*true|ledger[[:space:]_-]*append[[:space:]]*=[[:space:]]*true|ledger[[:space:]_-]*write[[:space:]]*=[[:space:]]*true|wc_ledger_write_enabled[[:space:]]*:[[:space:]]*true|wc_issuance_enabled[[:space:]]*:[[:space:]]*true|network_submit_enabled[[:space:]]*:[[:space:]]*true' "$SCRATCH_APPLY_TOOL" "$DOC"; then
  echo "no_mutation_authority_scan_green=false"; exit 1
fi
echo "no_mutation_authority_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_HOLD_V1_GREEN"
