#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_DECISION_HOLD_V1"
GEN_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1"
VERIFY_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_VERIFIER_HOLD_V1"
ROUNDTRIP_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_ROUNDTRIP_HOLD_V1"
QUEUE_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_QUEUE_HOLD_V1"

GEN_TOOL="tools/datanet-wc-evidence-packet.mjs"
VERIFY_TOOL="tools/datanet-wc-evidence-packet-verify.mjs"
ROUNDTRIP_TOOL="tools/datanet-wc-evidence-packet-roundtrip.mjs"
QUEUE_TOOL="tools/datanet-wc-evidence-packet-review-queue.mjs"
DECISION_TOOL="tools/datanet-wc-evidence-packet-review-decision.mjs"

DOC="docs/datanet/datanet-wc-evidence-packet-review-decision-hold-v1.md"
QUEUE_PROOF="ops/mainnet0/datanet-wc-evidence-packet-review-queue-hold-v1-proof.sh"
FIXTURE_DIR="fixtures/datanet-wc-evidence-packet/sample-input"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

PACKET="$TMP_DIR/packet.json"
VERIFY_OUT="$TMP_DIR/verify-out.json"
SUMMARY="$TMP_DIR/summary.json"
QUEUE_DIR="$TMP_DIR/queue"
QUEUE_OUT="$TMP_DIR/queue-out.json"
QUEUE_ENTRY="$TMP_DIR/queue-entry.json"
DECISION_A="$TMP_DIR/decision-a.json"
DECISION_B="$TMP_DIR/decision-b.json"
DECISION_OUT="$TMP_DIR/decision-out.json"
BAD_QUEUE="$TMP_DIR/bad-queue.json"
CREATED_AT="2026-07-02T00:00:00.000Z"

echo "== tools exist / syntax =="
test -x "$GEN_TOOL"
test -x "$VERIFY_TOOL"
test -x "$ROUNDTRIP_TOOL"
test -x "$QUEUE_TOOL"
test -x "$DECISION_TOOL"
node --check "$GEN_TOOL"
node --check "$VERIFY_TOOL"
node --check "$ROUNDTRIP_TOOL"
node --check "$QUEUE_TOOL"
node --check "$DECISION_TOOL"

echo "== review queue source proof =="
bash "$QUEUE_PROOF"

echo "== create queue entry =="
VOID_PACKET_CREATED_AT="$CREATED_AT" node "$ROUNDTRIP_TOOL" \
  --input "$FIXTURE_DIR" \
  --packet-out "$PACKET" \
  --work-id "demo-datanet-verification-artifact" \
  --worker "local-contributor" \
  --reviewer "operator-review-required" \
  --verify-out "$VERIFY_OUT" \
  --summary-out "$SUMMARY" >/tmp/void-review-decision-roundtrip.out

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

echo "== decision record =="
VOID_REVIEW_DECISION_CREATED_AT="$CREATED_AT" node "$DECISION_TOOL" \
  --queue-entry "$QUEUE_ENTRY" \
  --out "$DECISION_A" \
  --reviewer "operator-reviewer" \
  --decision "accept_evidence" \
  --reason "fixture evidence packet verified and ready for separate award review" > "$DECISION_OUT"

VOID_REVIEW_DECISION_CREATED_AT="$CREATED_AT" node "$DECISION_TOOL" \
  --queue-entry "$QUEUE_ENTRY" \
  --out "$DECISION_B" \
  --reviewer "operator-reviewer" \
  --decision "accept_evidence" \
  --reason "fixture evidence packet verified and ready for separate award review" >/tmp/void-review-decision-b.out

cmp "$DECISION_A" "$DECISION_B"
echo "decision_deterministic_green=true"

echo "== decision binding =="
python3 - "$QUEUE_ENTRY" "$DECISION_A" "$DECISION_OUT" "$MARKER" "$QUEUE_MARKER" "$ROUNDTRIP_MARKER" "$GEN_MARKER" "$VERIFY_MARKER" <<'PY'
import json
import pathlib
import re
import sys

queue_path, decision_path, out_path, marker, queue_marker, roundtrip_marker, gen_marker, verify_marker = sys.argv[1:9]

queue = json.load(open(queue_path, encoding="utf-8"))
decision = json.load(open(decision_path, encoding="utf-8"))
out = json.load(open(out_path, encoding="utf-8"))

assert out["marker"] == marker
assert out["status"] == "review_decision_recorded"
assert out["decision_id"] == decision["decision_id"]
assert out["decision"] == "accept_evidence"
assert pathlib.Path(out["out"]).exists()

assert decision["schema"] == "void.datanet.wc.evidence_packet_review_decision.v1"
assert decision["marker"] == marker
assert decision["status"] == "review_decision_recorded"
assert re.fullmatch(r"[0-9a-f]{64}", decision["decision_id"])
assert decision["reviewer"] == "operator-reviewer"
assert decision["decision"] == "accept_evidence"
assert "separate award review" in decision["reason"]

source = decision["source"]
assert source["queue_marker"] == queue_marker
assert source["review_id"] == queue["review_id"]
assert source["evidence_hash"] == queue["source"]["evidence_hash"]
assert source["work_id"] == "demo-datanet-verification-artifact"
assert source["worker"] == "local-contributor"
assert source["files"] == 2
assert source["summary_marker"] == roundtrip_marker
assert source["generator_marker"] == gen_marker
assert source["verifier_marker"] == verify_marker

policy = decision["work_credits_policy"]
assert policy["useful_verifiable_work_only"] is True
assert policy["unlimited_uncapped_accounting_units"] is True
assert policy["award_amount_included"] is False
assert policy["operator_review_required"] is True

boundary = decision["boundary"]
assert boundary["review_decision_record_only"] is True
for key in [
    "wc_award_approval_enabled",
    "wc_award_amount_enabled",
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

assert "no_award_amount" in out["boundary"]
assert "no_award_approval" in out["boundary"]
assert "no_ledger_write" in out["boundary"]
assert "no_network_submit" in out["boundary"]

print("decision_binding_green=true")
PY

echo "== invalid decision rejection =="
if node "$DECISION_TOOL" \
  --queue-entry "$QUEUE_ENTRY" \
  --out "$TMP_DIR/bad-decision.json" \
  --reviewer "operator-reviewer" \
  --decision "approve_award" \
  --reason "not allowed" >/tmp/void-bad-decision-out 2>/tmp/void-bad-decision-err; then
  echo "invalid_decision_rejection_green=false"
  cat /tmp/void-bad-decision-out
  exit 1
fi
grep -Fq "decision_not_allowed" /tmp/void-bad-decision-err
echo "invalid_decision_rejection_green=true"

echo "== bad queue rejection =="
python3 - "$QUEUE_ENTRY" "$BAD_QUEUE" <<'PY'
import json
import sys
entry = json.load(open(sys.argv[1], encoding="utf-8"))
entry["status"] = "not_pending"
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(entry, indent=2) + "\n")
PY

if node "$DECISION_TOOL" \
  --queue-entry "$BAD_QUEUE" \
  --out "$TMP_DIR/bad-queue-decision.json" \
  --reviewer "operator-reviewer" \
  --decision "accept_evidence" \
  --reason "bad queue should fail" >/tmp/void-bad-queue-decision-out 2>/tmp/void-bad-queue-decision-err; then
  echo "bad_queue_rejection_green=false"
  cat /tmp/void-bad-queue-decision-out
  exit 1
fi
grep -Fq "queue_status_mismatch" /tmp/void-bad-queue-decision-err
echo "bad_queue_rejection_green=true"

echo "== marker/source presence =="
grep -Fq "$MARKER" "$DECISION_TOOL"
grep -Fq "$MARKER" "$DOC"
grep -Fq "$MARKER" "$0"
grep -Fq "$QUEUE_MARKER" "$DECISION_TOOL"
grep -Fq "$ROUNDTRIP_MARKER" "$DECISION_TOOL"
grep -Fq "$GEN_MARKER" "$DECISION_TOOL"
grep -Fq "$VERIFY_MARKER" "$DECISION_TOOL"

echo "== forbidden WC cap wording scan =="
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$DECISION_TOOL" "$DOC"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== no mutation authority scan =="
if grep -RInE 'privateKey|mnemonic|signTransaction|sendTransaction|ledger[[:space:]_-]*write[[:space:]]*=[[:space:]]*true|wc_issuance_enabled[[:space:]]*:[[:space:]]*true|network_submit_enabled[[:space:]]*:[[:space:]]*true|wc_award_approval_enabled[[:space:]]*:[[:space:]]*true|wc_award_amount_enabled[[:space:]]*:[[:space:]]*true' "$DECISION_TOOL" "$DOC"; then
  echo "no_mutation_authority_scan_green=false"
  exit 1
fi
echo "no_mutation_authority_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_DECISION_HOLD_V1_GREEN"
