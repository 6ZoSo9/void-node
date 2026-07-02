#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_DRY_RUN_HOLD_V1"
LEDGER_PACKET_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_WRITE_PACKET_HOLD_V1"
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
DRY_RUN_TOOL="tools/datanet-wc-evidence-packet-ledger-append-dry-run.mjs"

DOC="docs/datanet/datanet-wc-evidence-packet-ledger-append-dry-run-hold-v1.md"
LEDGER_PACKET_PROOF="ops/mainnet0/datanet-wc-evidence-packet-ledger-write-packet-hold-v1-proof.sh"
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
DRY_A="$TMP_DIR/dry-a.json"
DRY_B="$TMP_DIR/dry-b.json"
DRY_OUT="$TMP_DIR/dry-out.json"
BAD_PACKET="$TMP_DIR/bad-packet.json"
CREATED_AT="2026-07-02T00:00:00.000Z"
ZERO_HASH="0000000000000000000000000000000000000000000000000000000000000000"

echo "== tools exist / syntax =="
for tool in "$GEN_TOOL" "$VERIFY_TOOL" "$ROUNDTRIP_TOOL" "$QUEUE_TOOL" "$DECISION_TOOL" "$PROPOSAL_TOOL" "$APPROVAL_TOOL" "$LEDGER_PACKET_TOOL" "$DRY_RUN_TOOL"; do
  test -x "$tool"
  node --check "$tool"
done

echo "== ledger write packet source proof =="
bash "$LEDGER_PACKET_PROOF"

echo "== create ledger write packet =="
VOID_PACKET_CREATED_AT="$CREATED_AT" node "$ROUNDTRIP_TOOL" \
  --input "$FIXTURE_DIR" \
  --packet-out "$PACKET" \
  --work-id "demo-datanet-verification-artifact" \
  --worker "local-contributor" \
  --reviewer "operator-review-required" \
  --verify-out "$VERIFY_OUT" \
  --summary-out "$SUMMARY" >/tmp/void-ledger-append-dry-run-roundtrip.out

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
  --reason "fixture evidence packet verified and ready for separate award review" >/tmp/void-ledger-append-dry-run-decision.out

VOID_AWARD_PROPOSAL_CREATED_AT="$CREATED_AT" node "$PROPOSAL_TOOL" \
  --decision "$DECISION_ACCEPT" \
  --out "$PROPOSAL" \
  --proposer "operator-reviewer" \
  --proposed-wc "100" \
  --reason "fixture verified useful DataNet evidence packet" >/tmp/void-ledger-append-dry-run-proposal.out

VOID_AWARD_APPROVAL_CREATED_AT="$CREATED_AT" node "$APPROVAL_TOOL" \
  --proposal "$PROPOSAL" \
  --out "$APPROVAL_OK" \
  --approver "operator-approver" \
  --decision "approve_award" \
  --reason "fixture award proposal approved for separate ledger write review" >/tmp/void-ledger-append-dry-run-approval.out

VOID_LEDGER_WRITE_PACKET_CREATED_AT="$CREATED_AT" node "$LEDGER_PACKET_TOOL" \
  --approval "$APPROVAL_OK" \
  --out "$LEDGER_PACKET" \
  --operator "operator-ledger-preparer" \
  --ledger "datanet-wc-awards" \
  --reason "fixture ready for separate operator ledger append review" >/tmp/void-ledger-append-dry-run-packet.out

echo "== ledger append dry run =="
VOID_LEDGER_APPEND_DRY_RUN_CREATED_AT="$CREATED_AT" node "$DRY_RUN_TOOL" \
  --packet "$LEDGER_PACKET" \
  --out "$DRY_A" \
  --operator "operator-ledger-preparer" \
  --ledger-current-hash "$ZERO_HASH" \
  --reason "fixture dry-run before separate operator append" > "$DRY_OUT"

VOID_LEDGER_APPEND_DRY_RUN_CREATED_AT="$CREATED_AT" node "$DRY_RUN_TOOL" \
  --packet "$LEDGER_PACKET" \
  --out "$DRY_B" \
  --operator "operator-ledger-preparer" \
  --ledger-current-hash "$ZERO_HASH" \
  --reason "fixture dry-run before separate operator append" >/tmp/void-ledger-append-dry-run-b.out

cmp "$DRY_A" "$DRY_B"
echo "ledger_append_dry_run_deterministic_green=true"

echo "== dry-run binding =="
python3 - "$LEDGER_PACKET" "$DRY_A" "$DRY_OUT" "$MARKER" "$LEDGER_PACKET_MARKER" "$APPROVAL_MARKER" "$PROPOSAL_MARKER" "$DECISION_MARKER" "$QUEUE_MARKER" "$ROUNDTRIP_MARKER" "$GEN_MARKER" "$VERIFY_MARKER" "$ZERO_HASH" <<'PY'
import json, pathlib, re, sys

ledger_packet_path, dry_path, out_path, marker, ledger_packet_marker, approval_marker, proposal_marker, decision_marker, queue_marker, roundtrip_marker, gen_marker, verify_marker, zero_hash = sys.argv[1:14]
packet = json.load(open(ledger_packet_path, encoding="utf-8"))
dry = json.load(open(dry_path, encoding="utf-8"))
out = json.load(open(out_path, encoding="utf-8"))

assert out["marker"] == marker
assert out["status"] == "ledger_append_dry_run_recorded"
assert out["dry_run_id"] == dry["dry_run_id"]
assert pathlib.Path(out["out"]).exists()
assert re.fullmatch(r"[0-9a-f]{64}", out["candidate_line_hash"])
assert re.fullmatch(r"[0-9a-f]{64}", out["candidate_next_ledger_hash"])

assert dry["schema"] == "void.datanet.wc.evidence_packet_ledger_append_dry_run.v1"
assert dry["marker"] == marker
assert dry["status"] == "ledger_append_dry_run_recorded"
assert re.fullmatch(r"[0-9a-f]{64}", dry["dry_run_id"])
assert dry["operator"] == "operator-ledger-preparer"
assert dry["ledger"] == "datanet-wc-awards"
assert dry["ledger_current_hash"] == zero_hash
assert dry["candidate_next_ledger_hash"] == out["candidate_next_ledger_hash"]

line = dry["candidate_line"]
assert line["schema"] == "void.datanet.wc.ledger_line_candidate.v1"
assert line["operation"] == "append_only_dry_run_candidate"
assert line["ledger"] == "datanet-wc-awards"
assert line["previous_ledger_hash"] == zero_hash
assert line["worker"] == "local-contributor"
assert line["work_id"] == "demo-datanet-verification-artifact"
assert line["approved_wc_amount"] == "100"
assert line["packet_id"] == packet["packet_id"]
assert re.fullmatch(r"[0-9a-f]{64}", line["candidate_line_hash"])

source = dry["source"]
assert source["packet_marker"] == ledger_packet_marker
assert source["packet_id"] == packet["packet_id"]
assert source["approval_marker"] == approval_marker
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

policy = dry["work_credits_policy"]
assert policy["useful_verifiable_work_only"] is True
assert policy["unlimited_uncapped_accounting_units"] is True
assert policy["finite_approved_amount_for_this_review"] is True
assert policy["separate_operator_append_required"] is True

boundary = dry["boundary"]
assert boundary["ledger_append_dry_run_only"] is True
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
print("ledger_append_dry_run_binding_green=true")
PY

echo "== invalid hash rejection =="
if node "$DRY_RUN_TOOL" \
  --packet "$LEDGER_PACKET" \
  --out "$TMP_DIR/bad-hash-dry-run.json" \
  --operator "operator-ledger-preparer" \
  --ledger-current-hash "not-a-hash" \
  --reason "bad hash should fail" >/tmp/void-dry-run-bad-hash-out 2>/tmp/void-dry-run-bad-hash-err; then
  echo "invalid_hash_rejection_green=false"; cat /tmp/void-dry-run-bad-hash-out; exit 1
fi
grep -Fq "ledger_current_hash_invalid" /tmp/void-dry-run-bad-hash-err
echo "invalid_hash_rejection_green=true"

echo "== bad packet rejection =="
python3 - "$LEDGER_PACKET" "$BAD_PACKET" <<'PY'
import json, sys
packet = json.load(open(sys.argv[1], encoding="utf-8"))
packet["status"] = "not_recorded"
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(packet, indent=2) + "\n")
PY

if node "$DRY_RUN_TOOL" \
  --packet "$BAD_PACKET" \
  --out "$TMP_DIR/bad-packet-dry-run.json" \
  --operator "operator-ledger-preparer" \
  --ledger-current-hash "$ZERO_HASH" \
  --reason "bad packet should fail" >/tmp/void-dry-run-bad-packet-out 2>/tmp/void-dry-run-bad-packet-err; then
  echo "bad_packet_rejection_green=false"; cat /tmp/void-dry-run-bad-packet-out; exit 1
fi
grep -Fq "packet_status_mismatch" /tmp/void-dry-run-bad-packet-err
echo "bad_packet_rejection_green=true"

echo "== marker/source presence =="
grep -Fq "$MARKER" "$DRY_RUN_TOOL"
grep -Fq "$MARKER" "$DOC"
grep -Fq "$MARKER" "$0"

echo "== forbidden WC cap wording scan =="
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$DRY_RUN_TOOL" "$DOC"; then
  echo "forbidden_wc_cap_scan_green=false"; exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== no mutation authority scan =="
if grep -RInE 'privateKey|mnemonic|signTransaction|sendTransaction|ledger[[:space:]_-]*append[[:space:]]*=[[:space:]]*true|ledger[[:space:]_-]*write[[:space:]]*=[[:space:]]*true|wc_ledger_write_enabled[[:space:]]*:[[:space:]]*true|wc_issuance_enabled[[:space:]]*:[[:space:]]*true|network_submit_enabled[[:space:]]*:[[:space:]]*true' "$DRY_RUN_TOOL" "$DOC"; then
  echo "no_mutation_authority_scan_green=false"; exit 1
fi
echo "no_mutation_authority_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_DRY_RUN_HOLD_V1_GREEN"
