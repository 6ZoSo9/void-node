#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_SCHEMA_CANDIDATE_INDEX_PATCH_CLOSEOUT_FINAL_SEAL_HOLD_V1"
CLOSEOUT_MARKER="VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_SCHEMA_CANDIDATE_INDEX_PATCH_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
INDEX_PATCH_MARKER="VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_SCHEMA_CANDIDATE_INDEX_PATCH_HOLD_V1"
SCHEMA_CANDIDATE_MARKER="VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_SCHEMA_CANDIDATE_HOLD_V1"

DOC="docs/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-index-patch-closeout-final-seal-hold-v1.md"
INDEX_JSON="public/public-node/work-credits/index.json"
CLOSEOUT_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-index-patch-closeout-audit-rollup-hold-v1.json"
CLOSEOUT_HTML="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-index-patch-closeout-audit-rollup-hold-v1.html"
INDEX_PATCH_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-index-patch-hold-v1.json"
INDEX_PATCH_HTML="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-index-patch-hold-v1.html"
SCHEMA_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-hold-v1.schema.json"
EXAMPLE_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-example-hold-v1.json"
SOURCE_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-hold-v1.json"
SOURCE_HTML="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-hold-v1.html"
PUBLIC_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-index-patch-closeout-final-seal-hold-v1.json"
PUBLIC_HTML="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-index-patch-closeout-final-seal-hold-v1.html"

echo "== JSON parse / final seal binding =="
python3 - "$PUBLIC_JSON" "$INDEX_JSON" "$CLOSEOUT_JSON" "$INDEX_PATCH_JSON" "$SCHEMA_JSON" "$EXAMPLE_JSON" "$SOURCE_JSON" "$MARKER" "$CLOSEOUT_MARKER" "$INDEX_PATCH_MARKER" "$SCHEMA_CANDIDATE_MARKER" <<'PY'
import json
import sys

public_path, index_path, closeout_path, index_patch_path, schema_path, example_path, source_path, marker, closeout_marker, index_patch_marker, schema_candidate_marker = sys.argv[1:12]

final_seal = json.load(open(public_path, encoding="utf-8"))
index_raw = open(index_path, encoding="utf-8").read()
json.loads(index_raw)
closeout = json.load(open(closeout_path, encoding="utf-8"))
index_patch = json.load(open(index_patch_path, encoding="utf-8"))
schema = json.load(open(schema_path, encoding="utf-8"))
example = json.load(open(example_path, encoding="utf-8"))
source = json.load(open(source_path, encoding="utf-8"))

assert final_seal["marker"] == marker
assert final_seal["status"] == "hold"
assert final_seal["public_surface"] is True
assert final_seal["read_only"] is True

source_meta = final_seal["source"]
assert source_meta["closeout_marker"] == closeout_marker
assert source_meta["index_patch_marker"] == index_patch_marker
assert source_meta["schema_candidate_marker"] == schema_candidate_marker

assert closeout["marker"] == closeout_marker
assert index_patch["marker"] == index_patch_marker
assert index_patch["source_marker"] == schema_candidate_marker
assert schema["$id"] == "void.datanet.wc.agent_attestation_envelope.schema_candidate.v1"
assert example["marker"] == schema_candidate_marker
assert source["marker"] == schema_candidate_marker
assert source["read_only"] is True

assert index_patch_marker in index_raw
assert schema_candidate_marker in index_raw

for name in [
    "datanet-wc-agent-attestation-envelope-schema-candidate-hold-v1.schema.json",
    "datanet-wc-agent-attestation-envelope-schema-candidate-example-hold-v1.json",
    "datanet-wc-agent-attestation-envelope-schema-candidate-hold-v1.json",
    "datanet-wc-agent-attestation-envelope-schema-candidate-hold-v1.html",
    "datanet-wc-agent-attestation-envelope-schema-candidate-index-patch-hold-v1.json",
    "datanet-wc-agent-attestation-envelope-schema-candidate-index-patch-hold-v1.html"
]:
    assert name in index_raw, name

for key, value in final_seal["seal"].items():
    assert value is True, key

boundary = final_seal["boundary"]
assert boundary["final_seal_only"] is True
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

print("agent_attestation_envelope_schema_candidate_index_patch_closeout_final_seal_binding_green=true")
PY

echo "== marker/source presence =="
for f in "$DOC" "$PUBLIC_JSON" "$PUBLIC_HTML" "$0"; do
  test -f "$f"
  grep -Fq "$MARKER" "$f"
done
grep -Fq "$CLOSEOUT_MARKER" "$CLOSEOUT_JSON"
grep -Fq "$CLOSEOUT_MARKER" "$CLOSEOUT_HTML"
grep -Fq "$INDEX_PATCH_MARKER" "$INDEX_JSON"
grep -Fq "$INDEX_PATCH_MARKER" "$INDEX_PATCH_JSON"
grep -Fq "$INDEX_PATCH_MARKER" "$INDEX_PATCH_HTML"
grep -Fq "$SCHEMA_CANDIDATE_MARKER" "$INDEX_JSON"
grep -Fq "$SCHEMA_CANDIDATE_MARKER" "$EXAMPLE_JSON"
grep -Fq "$SCHEMA_CANDIDATE_MARKER" "$SOURCE_JSON"
grep -Fq "$SCHEMA_CANDIDATE_MARKER" "$SOURCE_HTML"
test -f "$SCHEMA_JSON"
echo "marker_source_green=true"

echo "== public static read-only scan =="
if grep -RInE '<form|method=|fetch\(|XMLHttpRequest|navigator\.|localStorage|sessionStorage|indexedDB|onclick=|onload=|<script' "$PUBLIC_JSON" "$PUBLIC_HTML" "$CLOSEOUT_JSON" "$CLOSEOUT_HTML" "$INDEX_PATCH_JSON" "$INDEX_PATCH_HTML" "$SCHEMA_JSON" "$EXAMPLE_JSON" "$SOURCE_JSON" "$SOURCE_HTML"; then
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
echo "VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_SCHEMA_CANDIDATE_INDEX_PATCH_CLOSEOUT_FINAL_SEAL_HOLD_V1_GREEN"
