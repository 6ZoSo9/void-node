#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_ROUNDTRIP_HOLD_V1"
GEN_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1"
VERIFY_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_VERIFIER_HOLD_V1"
GEN_TOOL="tools/datanet-wc-evidence-packet.mjs"
VERIFY_TOOL="tools/datanet-wc-evidence-packet-verify.mjs"
ROUNDTRIP_TOOL="tools/datanet-wc-evidence-packet-roundtrip.mjs"
DOC="docs/datanet/datanet-wc-evidence-packet-roundtrip-hold-v1.md"
VERIFY_PROOF="ops/mainnet0/datanet-wc-evidence-packet-verifier-hold-v1-proof.sh"
FIXTURE_DIR="fixtures/datanet-wc-evidence-packet/sample-input"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

PACKET="$TMP_DIR/packet.json"
VERIFY_OUT="$TMP_DIR/verify-out.json"
SUMMARY_OUT="$TMP_DIR/summary.json"
STDOUT_SUMMARY="$TMP_DIR/stdout-summary.json"
CREATED_AT="2026-07-02T00:00:00.000Z"

echo "== tools exist / syntax =="
test -x "$GEN_TOOL"
test -x "$VERIFY_TOOL"
test -x "$ROUNDTRIP_TOOL"
node --check "$GEN_TOOL"
node --check "$VERIFY_TOOL"
node --check "$ROUNDTRIP_TOOL"

echo "== verifier source proof =="
bash "$VERIFY_PROOF"

echo "== roundtrip =="
VOID_PACKET_CREATED_AT="$CREATED_AT" node "$ROUNDTRIP_TOOL" \
  --input "$FIXTURE_DIR" \
  --packet-out "$PACKET" \
  --work-id "demo-datanet-verification-artifact" \
  --worker "local-contributor" \
  --reviewer "operator-review-required" \
  --verify-out "$VERIFY_OUT" \
  --summary-out "$SUMMARY_OUT" > "$STDOUT_SUMMARY"

echo "== roundtrip binding =="
python3 - "$PACKET" "$VERIFY_OUT" "$SUMMARY_OUT" "$STDOUT_SUMMARY" "$MARKER" "$GEN_MARKER" "$VERIFY_MARKER" <<'PY'
import json
import re
import sys

packet_path, verify_path, summary_path, stdout_path, marker, gen_marker, verify_marker = sys.argv[1:8]

packet = json.load(open(packet_path, encoding="utf-8"))
verify = json.load(open(verify_path, encoding="utf-8"))
summary = json.load(open(summary_path, encoding="utf-8"))
stdout_summary = json.load(open(stdout_path, encoding="utf-8"))

assert summary == stdout_summary
assert summary["schema"] == "void.datanet.wc.evidence_packet_roundtrip.v1"
assert summary["marker"] == marker
assert summary["status"] == "roundtrip_verified"
assert summary["generator_marker"] == gen_marker
assert summary["verifier_marker"] == verify_marker
assert summary["work_id"] == "demo-datanet-verification-artifact"
assert summary["worker"] == "local-contributor"
assert summary["reviewer"] == "operator-review-required"
assert summary["files"] == 2
assert re.fullmatch(r"[0-9a-f]{64}", summary["evidence_hash"])
assert summary["evidence_hash"] == packet["evidence_hash"]
assert summary["evidence_hash"] == verify["evidence_hash"]
assert summary["review_required"] is True

policy = summary["work_credits_policy"]
assert policy["useful_verifiable_work_only"] is True
assert policy["unlimited_uncapped_accounting_units"] is True
assert policy["award_amount_included"] is False
assert policy["operator_review_required"] is True

boundary = summary["boundary"]
assert boundary["roundtrip_only"] is True
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

print("roundtrip_binding_green=true")
PY

echo "== direct verifier confirms packet =="
node "$VERIFY_TOOL" \
  --packet "$PACKET" \
  --input "$FIXTURE_DIR" \
  --expect-work-id "demo-datanet-verification-artifact" \
  --expect-worker "local-contributor" \
  --expect-reviewer "operator-review-required" >/tmp/void-roundtrip-direct-verify.out
grep -Fq "$VERIFY_MARKER" /tmp/void-roundtrip-direct-verify.out
echo "direct_verifier_green=true"

echo "== marker/source presence =="
grep -Fq "$MARKER" "$ROUNDTRIP_TOOL"
grep -Fq "$MARKER" "$DOC"
grep -Fq "$MARKER" "$0"
grep -Fq "$GEN_MARKER" "$ROUNDTRIP_TOOL"
grep -Fq "$VERIFY_MARKER" "$ROUNDTRIP_TOOL"

echo "== forbidden WC cap wording scan =="
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$ROUNDTRIP_TOOL" "$DOC"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== no mutation authority scan =="
if grep -RInE 'privateKey|mnemonic|signTransaction|sendTransaction|ledger[[:space:]_-]*write[[:space:]]*=[[:space:]]*true|wc_issuance_enabled[[:space:]]*:[[:space:]]*true|network_submit_enabled[[:space:]]*:[[:space:]]*true' "$ROUNDTRIP_TOOL" "$DOC"; then
  echo "no_mutation_authority_scan_green=false"
  exit 1
fi
echo "no_mutation_authority_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_EVIDENCE_PACKET_ROUNDTRIP_HOLD_V1_GREEN"
