#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1"
TOOL="tools/datanet-wc-evidence-packet.mjs"
DOC="docs/datanet/datanet-wc-evidence-packet-generator-hold-v1.md"
FIXTURE_DIR="fixtures/datanet-wc-evidence-packet/sample-input"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

PACKET_A="$TMP_DIR/packet-a.json"
PACKET_B="$TMP_DIR/packet-b.json"
CREATED_AT="2026-07-02T00:00:00.000Z"

echo "== tool exists / syntax =="
test -x "$TOOL"
node --check "$TOOL"

echo "== generate packets =="
VOID_PACKET_CREATED_AT="$CREATED_AT" node "$TOOL" \
  --input "$FIXTURE_DIR" \
  --out "$PACKET_A" \
  --work-id "demo-datanet-verification-artifact" \
  --worker "local-contributor" \
  --reviewer "operator-review-required"

VOID_PACKET_CREATED_AT="$CREATED_AT" node "$TOOL" \
  --input "$FIXTURE_DIR" \
  --out "$PACKET_B" \
  --work-id "demo-datanet-verification-artifact" \
  --worker "local-contributor" \
  --reviewer "operator-review-required"

echo "== deterministic output =="
cmp "$PACKET_A" "$PACKET_B"
echo "deterministic_packet_green=true"

echo "== packet binding =="
python3 - "$PACKET_A" "$MARKER" <<'PY'
import json
import re
import sys

packet_path, marker = sys.argv[1:3]
packet = json.load(open(packet_path, encoding="utf-8"))

assert packet["schema"] == "void.datanet.wc.evidence_packet.v1"
assert packet["marker"] == marker
assert packet["status"] == "candidate_evidence_packet_generated"
assert packet["review_required"] is True
assert packet["work_id"] == "demo-datanet-verification-artifact"
assert packet["worker"] == "local-contributor"
assert packet["reviewer"] == "operator-review-required"
assert re.fullmatch(r"[0-9a-f]{64}", packet["evidence_hash"])

files = packet["files"]
assert len(files) == 2
assert [f["path"] for f in files] == sorted(f["path"] for f in files)
for f in files:
    assert re.fullmatch(r"[0-9a-f]{64}", f["sha256"])
    assert f["size_bytes"] > 0

policy = packet["work_credits_policy"]
assert policy["useful_verifiable_work_only"] is True
assert policy["unlimited_uncapped_accounting_units"] is True
assert policy["award_amount_included"] is False
assert policy["operator_review_required"] is True

boundary = packet["boundary"]
assert boundary["packet_generation_only"] is True
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

print("packet_binding_green=true")
PY

echo "== marker/source presence =="
grep -Fq "$MARKER" "$TOOL"
grep -Fq "$MARKER" "$DOC"
grep -Fq "$MARKER" "$0"

echo "== forbidden WC cap wording scan =="
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$TOOL" "$DOC" "$FIXTURE_DIR"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== no mutation authority scan =="
if grep -RInE 'privateKey|mnemonic|signTransaction|sendTransaction|ledger[[:space:]_-]*write[[:space:]]*=[[:space:]]*true|wc_issuance_enabled[[:space:]]*:[[:space:]]*true|network_submit_enabled[[:space:]]*:[[:space:]]*true' "$TOOL" "$DOC" "$FIXTURE_DIR"; then
  echo "no_mutation_authority_scan_green=false"
  exit 1
fi
echo "no_mutation_authority_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1_GREEN"
