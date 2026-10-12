#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_EXECUTE_PACKET_HOLD_V1"
DRY_RUN_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_DRY_RUN_HOLD_V1"

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

DOC="docs/datanet/datanet-wc-evidence-packet-ledger-append-execute-packet-hold-v1.md"
DRY_RUN_PROOF="ops/mainnet0/datanet-wc-evidence-packet-ledger-append-dry-run-hold-v1-proof.sh"
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
EXEC_A="$TMP_DIR/execute-a.json"
EXEC_B="$TMP_DIR/execute-b.json"
EXEC_OUT="$TMP_DIR/execute-out.json"
BAD_DRY="$TMP_DIR/bad-dry-run.json"
CREATED_AT="2026-07-02T00:00:00.000Z"
ZERO_HASH="0000000000000000000000000000000000000000000000000000000000000000"
CONFIRM="I_UNDERSTAND_THIS_IS_EXECUTE_PACKET_ONLY_NO_APPEND"

echo "== tools exist / syntax =="
for tool in "$GEN_TOOL" "$VERIFY_TOOL" "$ROUNDTRIP_TOOL" "$QUEUE_TOOL" "$DECISION_TOOL" "$PROPOSAL_TOOL" "$APPROVAL_TOOL" "$LEDGER_PACKET_TOOL" "$DRY_RUN_TOOL" "$EXECUTE_PACKET_TOOL"; do
  test -x "$tool"
  node --check "$tool"
done

echo "== ledger append dry-run source proof =="
bash "$DRY_RUN_PROOF"

echo "== create dry-run =="
VOID_PACKET_CREATED_AT="$CREATED_AT" node "$ROUNDTRIP_TOOL" \
  --input "$FIXTURE_DIR" \
  --packet-out "$PACKET" \
  --work-id "demo-datanet-verification-artifact" \
  --worker "local-contributor" \
  --reviewer "operator-review-required" \
  --verify-out "$VERIFY_OUT" \
  --summary-out "$SUMMARY" >/tmp/void-ledger-append-exec-roundtrip.out

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
  --reason "fixture evidence packet verified and ready for separate award review" >/tmp/void-ledger-append-exec-decision.out

VOID_AWARD_PROPOSAL_CREATED_AT="$CREATED_AT" node "$PROPOSAL_TOOL" \
  --decision "$DECISION_ACCEPT" \
  --out "$PROPOSAL" \
  --proposer "operator-reviewer" \
  --proposed-wc "100" \
  --reason "fixture verified useful DataNet evidence packet" >/tmp/void-ledger-append-exec-proposal.out

VOID_AWARD_APPROVAL_CREATED_AT="$CREATED_AT" node "$APPROVAL_TOOL" \
  --proposal "$PROPOSAL" \
  --out "$APPROVAL_OK" \
  --approver "operator-approver" \
  --decision "approve_award" \
  --reason "fixture award proposal approved for separate ledger write review" >/tmp/void-ledger-append-exec-approval.out

VOID_LEDGER_WRITE_PACKET_CREATED_AT="$CREATED_AT" node "$LEDGER_PACKET_TOOL" \
  --approval "$APPROVAL_OK" \
  --out "$LEDGER_PACKET" \
  --operator "operator-ledger-preparer" \
  --ledger "datanet-wc-awards" \
  --reason "fixture ready for separate operator ledger append review" >/tmp/void-ledger-append-exec-ledger-packet.out

VOID_LEDGER_APPEND_DRY_RUN_CREATED_AT="$CREATED_AT" node "$DRY_RUN_TOOL" \
  --packet "$LEDGER_PACKET" \
  --out "$DRY_RUN" \
  --operator "operator-ledger-preparer" \
  --ledger-current-hash "$ZERO_HASH" \
  --reason "fixture dry-run before separate operator append" >/tmp/void-ledger-append-exec-dry-run.out

echo "== execute packet =="
VOID_LEDGER_APPEND_EXECUTE_PACKET_CREATED_AT="$CREATED_AT" node "$EXECUTE_PACKET_TOOL" \
  --dry-run "$DRY_RUN" \
  --out "$EXEC_A" \
  --operator "operator-ledger-preparer" \
  --execution-mode "manual_operator_append_review" \
  --confirm "$CONFIRM" \
  --reason "fixture ready for separate manual append execution" > "$EXEC_OUT"

VOID_LEDGER_APPEND_EXECUTE_PACKET_CREATED_AT="$CREATED_AT" node "$EXECUTE_PACKET_TOOL" \
  --dry-run "$DRY_RUN" \
  --out "$EXEC_B" \
  --operator "operator-ledger-preparer" \
  --execution-mode "manual_operator_append_review" \
  --confirm "$CONFIRM" \
  --reason "fixture ready for separate manual append execution" >/tmp/void-ledger-append-exec-b.out

cmp "$EXEC_A" "$EXEC_B"
echo "ledger_append_execute_packet_deterministic_green=true"

echo "== execute packet binding =="
python3 - "$DRY_RUN" "$EXEC_A" "$EXEC_OUT" "$MARKER" "$DRY_RUN_MARKER" <<'PY'
import json, pathlib, re, sys

dry_path, exec_path, out_path, marker, dry_marker = sys.argv[1:6]
dry = json.load(open(dry_path, encoding="utf-8"))
packet = json.load(open(exec_path, encoding="utf-8"))
out = json.load(open(out_path, encoding="utf-8"))

assert out["marker"] == marker
assert out["status"] == "ledger_append_execute_packet_recorded"
assert out["execute_packet_id"] == packet["execute_packet_id"]
assert pathlib.Path(out["out"]).exists()
assert out["candidate_line_hash"] == dry["candidate_line"]["candidate_line_hash"]
assert out["candidate_next_ledger_hash"] == dry["candidate_next_ledger_hash"]

assert packet["schema"] == "void.datanet.wc.evidence_packet_ledger_append_execute_packet.v1"
assert packet["marker"] == marker
assert packet["status"] == "ledger_append_execute_packet_recorded"
assert re.fullmatch(r"[0-9a-f]{64}", packet["execute_packet_id"])
assert packet["operator"] == "operator-ledger-preparer"
assert packet["execution_mode"] == "manual_operator_append_review"

intent = packet["append_execution_intent"]
assert intent["operation"] == "append_only_manual_operator_candidate"
assert intent["ledger"] == "datanet-wc-awards"
assert intent["previous_ledger_hash"] == dry["ledger_current_hash"]
assert intent["candidate_line_hash"] == dry["candidate_line"]["candidate_line_hash"]
assert intent["candidate_next_ledger_hash"] == dry["candidate_next_ledger_hash"]
assert intent["candidate_line"]["approved_wc_amount"] == "100"
assert intent["candidate_line"]["worker"] == "local-contributor"

source = packet["source"]
assert source["dry_run_marker"] == dry_marker
assert source["dry_run_id"] == dry["dry_run_id"]
assert source["worker"] == "local-contributor"
assert source["work_id"] == "demo-datanet-verification-artifact"
assert source["files"] == 2

policy = packet["work_credits_policy"]
assert policy["useful_verifiable_work_only"] is True
assert policy["unlimited_uncapped_accounting_units"] is True
assert policy["finite_approved_amount_for_this_review"] is True
assert policy["separate_operator_append_execution_required"] is True

boundary = packet["boundary"]
assert boundary["execute_packet_only"] is True
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
assert "no_actual_ledger_write" in out["boundary"]
assert "no_network_submit" in out["boundary"]
print("ledger_append_execute_packet_binding_green=true")
PY

echo "== confirm rejection =="
if node "$EXECUTE_PACKET_TOOL" \
  --dry-run "$DRY_RUN" \
  --out "$TMP_DIR/bad-confirm-exec.json" \
  --operator "operator-ledger-preparer" \
  --execution-mode "manual_operator_append_review" \
  --confirm "WRONG" \
  --reason "bad confirm should fail" >/tmp/void-exec-bad-confirm-out 2>/tmp/void-exec-bad-confirm-err; then
  echo "confirm_rejection_green=false"; cat /tmp/void-exec-bad-confirm-out; exit 1
fi
grep -Fq "confirm_phrase_mismatch" /tmp/void-exec-bad-confirm-err
echo "confirm_rejection_green=true"

echo "== bad dry-run rejection =="
python3 - "$DRY_RUN" "$BAD_DRY" <<'PY'
import json, sys
record = json.load(open(sys.argv[1], encoding="utf-8"))
record["status"] = "not_recorded"
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(record, indent=2) + "\n")
PY

if node "$EXECUTE_PACKET_TOOL" \
  --dry-run "$BAD_DRY" \
  --out "$TMP_DIR/bad-dry-exec.json" \
  --operator "operator-ledger-preparer" \
  --execution-mode "manual_operator_append_review" \
  --confirm "$CONFIRM" \
  --reason "bad dry run should fail" >/tmp/void-exec-bad-dry-out 2>/tmp/void-exec-bad-dry-err; then
  echo "bad_dry_run_rejection_green=false"; cat /tmp/void-exec-bad-dry-out; exit 1
fi
grep -Fq "dry_run_status_mismatch" /tmp/void-exec-bad-dry-err
echo "bad_dry_run_rejection_green=true"

echo "== marker/source presence =="
grep -Fq "$MARKER" "$EXECUTE_PACKET_TOOL"
grep -Fq "$MARKER" "$DOC"
grep -Fq "$MARKER" "$0"

echo "== forbidden WC cap wording scan =="
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$EXECUTE_PACKET_TOOL" "$DOC"; then
  echo "forbidden_wc_cap_scan_green=false"; exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== no mutation authority scan =="
if grep -RInE 'privateKey|mnemonic|signTransaction|sendTransaction|ledger[[:space:]_-]*append[[:space:]]*=[[:space:]]*true|ledger[[:space:]_-]*write[[:space:]]*=[[:space:]]*true|wc_ledger_write_enabled[[:space:]]*:[[:space:]]*true|wc_issuance_enabled[[:space:]]*:[[:space:]]*true|network_submit_enabled[[:space:]]*:[[:space:]]*true' "$EXECUTE_PACKET_TOOL" "$DOC"; then
  echo "no_mutation_authority_scan_green=false"; exit 1
fi
echo "no_mutation_authority_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_EXECUTE_PACKET_HOLD_V1_GREEN"
