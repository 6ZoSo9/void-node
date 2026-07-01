#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_REVIEWER_CHECKLIST_TEMPLATE_HOLD_V1"
VALIDATION_FINAL_SEAL_MARKER="VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_VALIDATION_RECEIPT_INDEX_PATCH_CLOSEOUT_FINAL_SEAL_HOLD_V1"
VALIDATION_RECEIPT_MARKER="VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_VALIDATION_RECEIPT_HOLD_V1"
SCHEMA_CANDIDATE_MARKER="VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_SCHEMA_CANDIDATE_HOLD_V1"

DOC="docs/work-credits/datanet-wc-agent-attestation-envelope-reviewer-checklist-template-hold-v1.md"
VALIDATION_FINAL_SEAL_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-validation-receipt-index-patch-closeout-final-seal-hold-v1.json"
VALIDATION_FINAL_SEAL_HTML="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-validation-receipt-index-patch-closeout-final-seal-hold-v1.html"
VALIDATION_RECEIPT_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-validation-receipt-hold-v1.json"
SCHEMA_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-hold-v1.schema.json"
EXAMPLE_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-example-hold-v1.json"
PUBLIC_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-reviewer-checklist-template-hold-v1.json"
PUBLIC_HTML="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-reviewer-checklist-template-hold-v1.html"

echo "== JSON parse / reviewer checklist template binding =="
python3 - "$PUBLIC_JSON" "$VALIDATION_FINAL_SEAL_JSON" "$VALIDATION_RECEIPT_JSON" "$SCHEMA_JSON" "$EXAMPLE_JSON" "$MARKER" "$VALIDATION_FINAL_SEAL_MARKER" "$VALIDATION_RECEIPT_MARKER" "$SCHEMA_CANDIDATE_MARKER" <<'PY'
import json
import sys

public_path, final_seal_path, validation_path, schema_path, example_path, marker, final_seal_marker, validation_marker, schema_marker = sys.argv[1:10]

checklist = json.load(open(public_path, encoding="utf-8"))
final_seal = json.load(open(final_seal_path, encoding="utf-8"))
validation = json.load(open(validation_path, encoding="utf-8"))
schema = json.load(open(schema_path, encoding="utf-8"))
example = json.load(open(example_path, encoding="utf-8"))

assert checklist["marker"] == marker
assert checklist["status"] == "hold"
assert checklist["public_surface"] is True
assert checklist["read_only"] is True

source = checklist["source"]
assert source["validation_final_seal_marker"] == final_seal_marker
assert source["validation_receipt_marker"] == validation_marker
assert source["schema_candidate_marker"] == schema_marker

assert final_seal["marker"] == final_seal_marker
assert final_seal["read_only"] is True
assert validation["marker"] == validation_marker
assert validation["read_only"] is True
assert schema["$id"] == "void.datanet.wc.agent_attestation_envelope.schema_candidate.v1"
assert example["marker"] == schema_marker

items = checklist["checklist"]
assert isinstance(items, list)
assert len(items) == 9
ids = {item["id"] for item in items}
for expected in [
    "schema_binding",
    "validation_receipt_binding",
    "actor_identity_reference",
    "artifact_reference",
    "evidence_packet_reference",
    "proof_command_reference",
    "review_decision_reference",
    "award_state_sanity",
    "authority_boundary_preserved"
]:
    assert expected in ids, expected

for item in items:
    assert item["required"] is True, item["id"]

boundary = checklist["boundary"]
assert boundary["reviewer_checklist_template_only"] is True
for key in [
    "review_decision_created",
    "wc_award_recommended",
    "wc_award_approved",
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

print("agent_attestation_envelope_reviewer_checklist_template_binding_green=true")
PY

echo "== marker/source presence =="
for f in "$DOC" "$PUBLIC_JSON" "$PUBLIC_HTML" "$0"; do
  test -f "$f"
  grep -Fq "$MARKER" "$f"
done
grep -Fq "$VALIDATION_FINAL_SEAL_MARKER" "$DOC"
grep -Fq "$VALIDATION_FINAL_SEAL_MARKER" "$PUBLIC_JSON"
grep -Fq "$VALIDATION_FINAL_SEAL_MARKER" "$VALIDATION_FINAL_SEAL_JSON"
grep -Fq "$VALIDATION_FINAL_SEAL_MARKER" "$VALIDATION_FINAL_SEAL_HTML"
grep -Fq "$VALIDATION_RECEIPT_MARKER" "$DOC"
grep -Fq "$VALIDATION_RECEIPT_MARKER" "$PUBLIC_JSON"
grep -Fq "$VALIDATION_RECEIPT_MARKER" "$VALIDATION_RECEIPT_JSON"
grep -Fq "$SCHEMA_CANDIDATE_MARKER" "$DOC"
grep -Fq "$SCHEMA_CANDIDATE_MARKER" "$PUBLIC_JSON"
grep -Fq "$SCHEMA_CANDIDATE_MARKER" "$EXAMPLE_JSON"
test -f "$SCHEMA_JSON"
echo "marker_source_green=true"

echo "== public static read-only scan =="
if grep -RInE '<form|method=|fetch\(|XMLHttpRequest|navigator\.|localStorage|sessionStorage|indexedDB|onclick=|onload=|<script' "$PUBLIC_JSON" "$PUBLIC_HTML" "$VALIDATION_FINAL_SEAL_JSON" "$VALIDATION_FINAL_SEAL_HTML" "$VALIDATION_RECEIPT_JSON" "$SCHEMA_JSON" "$EXAMPLE_JSON"; then
  echo "public_static_readonly_scan_green=false"
  exit 1
fi
echo "public_static_readonly_scan_green=true"

echo "== authority boundary scan =="
grep -Fq '"review_decision_created": false' "$PUBLIC_JSON"
grep -Fq '"wc_award_recommended": false' "$PUBLIC_JSON"
grep -Fq '"wc_award_approved": false' "$PUBLIC_JSON"
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
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$DOC" "$PUBLIC_JSON" "$PUBLIC_HTML" "$VALIDATION_FINAL_SEAL_JSON" "$VALIDATION_RECEIPT_JSON"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_REVIEWER_CHECKLIST_TEMPLATE_HOLD_V1_GREEN"
