#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_VERIFIER_HOLD_V1"
GEN_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1"
GEN_TOOL="tools/datanet-wc-evidence-packet.mjs"
VERIFY_TOOL="tools/datanet-wc-evidence-packet-verify.mjs"
DOC="docs/datanet/datanet-wc-evidence-packet-verifier-hold-v1.md"
GEN_PROOF="ops/mainnet0/datanet-wc-evidence-packet-generator-hold-v1-proof.sh"
FIXTURE_DIR="fixtures/datanet-wc-evidence-packet/sample-input"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

PACKET="$TMP_DIR/packet.json"
TAMPERED="$TMP_DIR/tampered.json"
VERIFY_OUT="$TMP_DIR/verify-out.json"
CREATED_AT="2026-07-02T00:00:00.000Z"

echo "== tools exist / syntax =="
test -x "$GEN_TOOL"
test -x "$VERIFY_TOOL"
node --check "$GEN_TOOL"
node --check "$VERIFY_TOOL"

echo "== generator source proof =="
bash "$GEN_PROOF"

echo "== generate packet =="
VOID_PACKET_CREATED_AT="$CREATED_AT" node "$GEN_TOOL" \
  --input "$FIXTURE_DIR" \
  --out "$PACKET" \
  --work-id "demo-datanet-verification-artifact" \
  --worker "local-contributor" \
  --reviewer "operator-review-required"

echo "== verify packet =="
node "$VERIFY_TOOL" \
  --packet "$PACKET" \
  --input "$FIXTURE_DIR" \
  --expect-work-id "demo-datanet-verification-artifact" \
  --expect-worker "local-contributor" \
  --expect-reviewer "operator-review-required" > "$VERIFY_OUT"

python3 - "$VERIFY_OUT" "$MARKER" "$GEN_MARKER" <<'PY'
import json
import re
import sys

out_path, marker, gen_marker = sys.argv[1:4]
result = json.load(open(out_path, encoding="utf-8"))
assert result["marker"] == marker
assert result["status"] == "verified"
assert result["packet_marker"] == gen_marker
assert result["work_id"] == "demo-datanet-verification-artifact"
assert result["worker"] == "local-contributor"
assert result["files"] == 2
assert re.fullmatch(r"[0-9a-f]{64}", result["evidence_hash"])
assert result["review_required"] is True
assert "no_award" in result["boundary"]
assert "no_ledger_write" in result["boundary"]
assert "no_network_submit" in result["boundary"]
print("verify_result_binding_green=true")
PY

echo "== tamper rejection =="
python3 - "$PACKET" "$TAMPERED" <<'PY'
import json
import sys
packet = json.load(open(sys.argv[1], encoding="utf-8"))
packet["files"][0]["sha256"] = "0" * 64
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(packet, indent=2) + "\n")
PY

if node "$VERIFY_TOOL" --packet "$TAMPERED" --input "$FIXTURE_DIR" >/tmp/void-tamper-out 2>/tmp/void-tamper-err; then
  echo "tamper_rejection_green=false"
  cat /tmp/void-tamper-out
  exit 1
fi
grep -Eq 'file_manifest_mismatch|evidence_hash_mismatch' /tmp/void-tamper-err
echo "tamper_rejection_green=true"

echo "== marker/source presence =="
grep -Fq "$MARKER" "$VERIFY_TOOL"
grep -Fq "$MARKER" "$DOC"
grep -Fq "$MARKER" "$0"
grep -Fq "$GEN_MARKER" "$VERIFY_TOOL"

echo "== forbidden WC cap wording scan =="
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$VERIFY_TOOL" "$DOC"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== no mutation authority scan =="
if grep -RInE 'privateKey|mnemonic|signTransaction|sendTransaction|ledger[[:space:]_-]*write[[:space:]]*=[[:space:]]*true|wc_issuance_enabled[[:space:]]*:[[:space:]]*true|network_submit_enabled[[:space:]]*:[[:space:]]*true' "$VERIFY_TOOL" "$DOC"; then
  echo "no_mutation_authority_scan_green=false"
  exit 1
fi
echo "no_mutation_authority_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_EVIDENCE_PACKET_VERIFIER_HOLD_V1_GREEN"
