#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_QUEUE_HOLD_V1"
GEN_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1"
VERIFY_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_VERIFIER_HOLD_V1"
ROUNDTRIP_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_ROUNDTRIP_HOLD_V1"

GEN_TOOL="tools/datanet-wc-evidence-packet.mjs"
VERIFY_TOOL="tools/datanet-wc-evidence-packet-verify.mjs"
ROUNDTRIP_TOOL="tools/datanet-wc-evidence-packet-roundtrip.mjs"
QUEUE_TOOL="tools/datanet-wc-evidence-packet-review-queue.mjs"

DOC="docs/datanet/datanet-wc-evidence-packet-review-queue-hold-v1.md"
ROUNDTRIP_PROOF="ops/mainnet0/datanet-wc-evidence-packet-roundtrip-hold-v1-proof.sh"
FIXTURE_DIR="fixtures/datanet-wc-evidence-packet/sample-input"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

PACKET="$TMP_DIR/packet.json"
VERIFY_OUT="$TMP_DIR/verify-out.json"
SUMMARY="$TMP_DIR/summary.json"
QUEUE_DIR_A="$TMP_DIR/queue-a"
QUEUE_DIR_B="$TMP_DIR/queue-b"
QUEUE_OUT_A="$TMP_DIR/queue-out-a.json"
QUEUE_OUT_B="$TMP_DIR/queue-out-b.json"
BAD_SUMMARY="$TMP_DIR/bad-summary.json"
CREATED_AT="2026-07-02T00:00:00.000Z"

echo "== tools exist / syntax =="
test -x "$GEN_TOOL"
test -x "$VERIFY_TOOL"
test -x "$ROUNDTRIP_TOOL"
test -x "$QUEUE_TOOL"
node --check "$GEN_TOOL"
node --check "$VERIFY_TOOL"
node --check "$ROUNDTRIP_TOOL"
node --check "$QUEUE_TOOL"

echo "== roundtrip source proof =="
bash "$ROUNDTRIP_PROOF"

echo "== create roundtrip summary =="
VOID_PACKET_CREATED_AT="$CREATED_AT" node "$ROUNDTRIP_TOOL" \
  --input "$FIXTURE_DIR" \
  --packet-out "$PACKET" \
  --work-id "demo-datanet-verification-artifact" \
  --worker "local-contributor" \
  --reviewer "operator-review-required" \
  --verify-out "$VERIFY_OUT" \
  --summary-out "$SUMMARY" >/tmp/void-review-queue-roundtrip.out

echo "== queue summary =="
VOID_REVIEW_QUEUE_CREATED_AT="$CREATED_AT" node "$QUEUE_TOOL" \
  --summary "$SUMMARY" \
  --queue-dir "$QUEUE_DIR_A" \
  --reviewer "operator-reviewer" \
  --note "fixture pending operator review" > "$QUEUE_OUT_A"

VOID_REVIEW_QUEUE_CREATED_AT="$CREATED_AT" node "$QUEUE_TOOL" \
  --summary "$SUMMARY" \
  --queue-dir "$QUEUE_DIR_B" \
  --reviewer "operator-reviewer" \
  --note "fixture pending operator review" > "$QUEUE_OUT_B"

echo "== queue binding =="
python3 - "$SUMMARY" "$QUEUE_OUT_A" "$QUEUE_OUT_B" "$QUEUE_DIR_A" "$QUEUE_DIR_B" "$MARKER" "$ROUNDTRIP_MARKER" "$GEN_MARKER" "$VERIFY_MARKER" <<'PY'
import json
import pathlib
import re
import sys

summary_path, out_a_path, out_b_path, queue_a, queue_b, marker, roundtrip_marker, gen_marker, verify_marker = sys.argv[1:10]

summary = json.load(open(summary_path, encoding="utf-8"))
out_a = json.load(open(out_a_path, encoding="utf-8"))
out_b = json.load(open(out_b_path, encoding="utf-8"))

assert out_a["marker"] == marker
assert out_a["status"] == "queued_for_operator_review"
assert out_a["review_id"] == out_b["review_id"]
assert re.fullmatch(r"[0-9a-f]{64}", out_a["review_id"])
assert out_a["evidence_hash"] == summary["evidence_hash"]
assert out_a["work_id"] == summary["work_id"]
assert out_a["worker"] == summary["worker"]
assert out_a["reviewer"] == "operator-reviewer"
assert "no_decision" in out_a["boundary"]
assert "no_award" in out_a["boundary"]
assert "no_ledger_write" in out_a["boundary"]

queue_file_a = pathlib.Path(out_a["queue_file"])
queue_file_b = pathlib.Path(out_b["queue_file"])
assert queue_file_a.exists()
assert queue_file_b.exists()
entry = json.load(open(queue_file_a, encoding="utf-8"))

assert entry["schema"] == "void.datanet.wc.evidence_packet_review_queue.v1"
assert entry["marker"] == marker
assert entry["status"] == "pending_operator_review"
assert entry["review_id"] == out_a["review_id"]
assert entry["reviewer"] == "operator-reviewer"
assert entry["source"]["summary_marker"] == roundtrip_marker
assert entry["source"]["generator_marker"] == gen_marker
assert entry["source"]["verifier_marker"] == verify_marker
assert entry["source"]["evidence_hash"] == summary["evidence_hash"]
assert entry["source"]["work_id"] == "demo-datanet-verification-artifact"
assert entry["source"]["worker"] == "local-contributor"
assert entry["source"]["files"] == 2
assert entry["source"]["review_required"] is True

policy = entry["work_credits_policy"]
assert policy["useful_verifiable_work_only"] is True
assert policy["unlimited_uncapped_accounting_units"] is True
assert policy["award_amount_included"] is False
assert policy["operator_review_required"] is True

boundary = entry["boundary"]
assert boundary["review_queue_only"] is True
for key in [
    "review_decision_enabled",
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

print("queue_binding_green=true")
PY

echo "== bad summary rejection =="
python3 - "$SUMMARY" "$BAD_SUMMARY" <<'PY'
import json
import sys
summary = json.load(open(sys.argv[1], encoding="utf-8"))
summary["status"] = "not_verified"
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(summary, indent=2) + "\n")
PY

if node "$QUEUE_TOOL" --summary "$BAD_SUMMARY" --queue-dir "$TMP_DIR/bad-queue" >/tmp/void-bad-queue-out 2>/tmp/void-bad-queue-err; then
  echo "bad_summary_rejection_green=false"
  cat /tmp/void-bad-queue-out
  exit 1
fi
grep -Fq "summary_status_mismatch" /tmp/void-bad-queue-err
echo "bad_summary_rejection_green=true"

echo "== marker/source presence =="
grep -Fq "$MARKER" "$QUEUE_TOOL"
grep -Fq "$MARKER" "$DOC"
grep -Fq "$MARKER" "$0"
grep -Fq "$GEN_MARKER" "$QUEUE_TOOL"
grep -Fq "$VERIFY_MARKER" "$QUEUE_TOOL"
grep -Fq "$ROUNDTRIP_MARKER" "$QUEUE_TOOL"

echo "== forbidden WC cap wording scan =="
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$QUEUE_TOOL" "$DOC"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== no mutation authority scan =="
if grep -RInE 'privateKey|mnemonic|signTransaction|sendTransaction|ledger[[:space:]_-]*write[[:space:]]*=[[:space:]]*true|wc_issuance_enabled[[:space:]]*:[[:space:]]*true|network_submit_enabled[[:space:]]*:[[:space:]]*true|review_decision_enabled[[:space:]]*:[[:space:]]*true|wc_award_approval_enabled[[:space:]]*:[[:space:]]*true' "$QUEUE_TOOL" "$DOC"; then
  echo "no_mutation_authority_scan_green=false"
  exit 1
fi
echo "no_mutation_authority_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_QUEUE_HOLD_V1_GREEN"
