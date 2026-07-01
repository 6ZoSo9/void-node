#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_VALIDATION_RECEIPT_INDEX_PATCH_HOLD_V1"
SOURCE_MARKER="VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_VALIDATION_RECEIPT_HOLD_V1"
FINAL_SEAL_MARKER="VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_SCHEMA_CANDIDATE_INDEX_PATCH_CLOSEOUT_FINAL_SEAL_HOLD_V1"
SCHEMA_CANDIDATE_MARKER="VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_SCHEMA_CANDIDATE_HOLD_V1"

DOC="docs/work-credits/datanet-wc-agent-attestation-envelope-validation-receipt-index-patch-hold-v1.md"
INDEX_JSON="public/public-node/work-credits/index.json"
SOURCE_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-validation-receipt-hold-v1.json"
SOURCE_HTML="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-validation-receipt-hold-v1.html"
SCHEMA_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-hold-v1.schema.json"
EXAMPLE_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-example-hold-v1.json"
FINAL_SEAL_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-index-patch-closeout-final-seal-hold-v1.json"
PUBLIC_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-validation-receipt-index-patch-hold-v1.json"
PUBLIC_HTML="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-validation-receipt-index-patch-hold-v1.html"

echo "== JSON parse / validation receipt index patch binding =="
python3 - "$INDEX_JSON" "$PUBLIC_JSON" "$SOURCE_JSON" "$SCHEMA_JSON" "$EXAMPLE_JSON" "$FINAL_SEAL_JSON" "$MARKER" "$SOURCE_MARKER" "$FINAL_SEAL_MARKER" "$SCHEMA_CANDIDATE_MARKER" <<'PY'
import json
import sys

index_path, patch_path, source_path, schema_path, example_path, final_seal_path, marker, source_marker, final_seal_marker, schema_candidate_marker = sys.argv[1:11]

index_raw = open(index_path, encoding="utf-8").read()
json.loads(index_raw)
patch = json.load(open(patch_path, encoding="utf-8"))
source = json.load(open(source_path, encoding="utf-8"))
schema = json.load(open(schema_path, encoding="utf-8"))
example = json.load(open(example_path, encoding="utf-8"))
final_seal = json.load(open(final_seal_path, encoding="utf-8"))

assert patch["marker"] == marker
assert patch["source_marker"] == source_marker
assert patch["status"] == "hold"
assert patch["public_surface"] is True
assert patch["read_only"] is True

assert source["marker"] == source_marker
assert source["read_only"] is True
assert source["source"]["final_seal_marker"] == final_seal_marker
assert source["source"]["schema_candidate_marker"] == schema_candidate_marker

assert schema["$id"] == "void.datanet.wc.agent_attestation_envelope.schema_candidate.v1"
assert example["marker"] == schema_candidate_marker
assert final_seal["marker"] == final_seal_marker
assert final_seal["read_only"] is True

assert marker in index_raw
assert source_marker in index_raw
assert final_seal_marker in index_raw
assert schema_candidate_marker in index_raw

for name in [
    "datanet-wc-agent-attestation-envelope-validation-receipt-hold-v1.json",
    "datanet-wc-agent-attestation-envelope-validation-receipt-hold-v1.html",
    "datanet-wc-agent-attestation-envelope-schema-candidate-hold-v1.schema.json",
    "datanet-wc-agent-attestation-envelope-schema-candidate-example-hold-v1.json",
    "datanet-wc-agent-attestation-envelope-schema-candidate-index-patch-closeout-final-seal-hold-v1.json",
    "datanet-wc-agent-attestation-envelope-validation-receipt-index-patch-hold-v1.json",
    "datanet-wc-agent-attestation-envelope-validation-receipt-index-patch-hold-v1.html"
]:
    assert name in index_raw, name

boundary = patch["boundary"]
assert boundary["index_discovery_only"] is True
for key in [
    "identity_registry_write_enabled",
    "attestation_registry_write_enabled",
    "public_mutation_enabled",
    "automatic_wc_award_enabled",
    "wc_issuance_enabled",
    "wc_ledger_write_enabled",
    "reviewer_staking_enabled",
    "void_transfer_enabled",
    "wallet_path_enabled",
    "signer_path_enabled"
]:
    assert boundary[key] is False, key

print("agent_attestation_envelope_validation_receipt_index_patch_binding_green=true")
PY

echo "== marker/source presence =="
for f in "$DOC" "$INDEX_JSON" "$PUBLIC_JSON" "$PUBLIC_HTML" "$0"; do
  test -f "$f"
  grep -Fq "$MARKER" "$f"
done
grep -Fq "$SOURCE_MARKER" "$INDEX_JSON"
grep -Fq "$SOURCE_MARKER" "$SOURCE_JSON"
grep -Fq "$SOURCE_MARKER" "$SOURCE_HTML"
grep -Fq "$FINAL_SEAL_MARKER" "$INDEX_JSON"
grep -Fq "$FINAL_SEAL_MARKER" "$FINAL_SEAL_JSON"
grep -Fq "$SCHEMA_CANDIDATE_MARKER" "$INDEX_JSON"
grep -Fq "$SCHEMA_CANDIDATE_MARKER" "$EXAMPLE_JSON"
test -f "$SCHEMA_JSON"
echo "marker_source_green=true"

echo "== public static read-only scan =="
if grep -RInE '<form|method=|fetch\(|XMLHttpRequest|navigator\.|localStorage|sessionStorage|indexedDB|onclick=|onload=|<script' "$PUBLIC_JSON" "$PUBLIC_HTML" "$SOURCE_JSON" "$SOURCE_HTML" "$SCHEMA_JSON" "$EXAMPLE_JSON" "$FINAL_SEAL_JSON"; then
  echo "public_static_readonly_scan_green=false"
  exit 1
fi
echo "public_static_readonly_scan_green=true"

echo "== authority boundary scan =="
grep -Fq '"identity_registry_write_enabled": false' "$PUBLIC_JSON"
grep -Fq '"attestation_registry_write_enabled": false' "$PUBLIC_JSON"
grep -Fq '"public_mutation_enabled": false' "$PUBLIC_JSON"
grep -Fq '"automatic_wc_award_enabled": false' "$PUBLIC_JSON"
grep -Fq '"wc_issuance_enabled": false' "$PUBLIC_JSON"
grep -Fq '"wc_ledger_write_enabled": false' "$PUBLIC_JSON"
grep -Fq '"reviewer_staking_enabled": false' "$PUBLIC_JSON"
grep -Fq '"void_transfer_enabled": false' "$PUBLIC_JSON"
grep -Fq '"wallet_path_enabled": false' "$PUBLIC_JSON"
grep -Fq '"signer_path_enabled": false' "$PUBLIC_JSON"
echo "authority_boundary_green=true"

echo "== forbidden WC cap wording scan =="
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$DOC" "$INDEX_JSON" "$PUBLIC_JSON" "$PUBLIC_HTML"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_VALIDATION_RECEIPT_INDEX_PATCH_HOLD_V1_GREEN"
