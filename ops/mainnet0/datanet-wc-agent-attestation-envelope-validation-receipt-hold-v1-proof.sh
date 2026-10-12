#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_VALIDATION_RECEIPT_HOLD_V1"
FINAL_SEAL_MARKER="VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_SCHEMA_CANDIDATE_INDEX_PATCH_CLOSEOUT_FINAL_SEAL_HOLD_V1"
SCHEMA_CANDIDATE_MARKER="VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_SCHEMA_CANDIDATE_HOLD_V1"

DOC="docs/work-credits/datanet-wc-agent-attestation-envelope-validation-receipt-hold-v1.md"
SCHEMA_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-hold-v1.schema.json"
EXAMPLE_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-example-hold-v1.json"
SCHEMA_STATUS_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-hold-v1.json"
FINAL_SEAL_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-index-patch-closeout-final-seal-hold-v1.json"
FINAL_SEAL_HTML="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-index-patch-closeout-final-seal-hold-v1.html"
PUBLIC_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-validation-receipt-hold-v1.json"
PUBLIC_HTML="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-validation-receipt-hold-v1.html"

echo "== JSON parse / validation receipt binding =="
python3 - "$SCHEMA_JSON" "$EXAMPLE_JSON" "$SCHEMA_STATUS_JSON" "$FINAL_SEAL_JSON" "$PUBLIC_JSON" "$MARKER" "$FINAL_SEAL_MARKER" "$SCHEMA_CANDIDATE_MARKER" <<'PY'
import json
import sys

schema_path, example_path, status_path, final_seal_path, public_path, marker, final_seal_marker, schema_candidate_marker = sys.argv[1:9]

schema = json.load(open(schema_path, encoding="utf-8"))
example = json.load(open(example_path, encoding="utf-8"))
status = json.load(open(status_path, encoding="utf-8"))
final_seal = json.load(open(final_seal_path, encoding="utf-8"))
receipt = json.load(open(public_path, encoding="utf-8"))

assert schema["$id"] == "void.datanet.wc.agent_attestation_envelope.schema_candidate.v1"
assert schema["properties"]["schema"]["const"] == "void.datanet.wc.agent_attestation_envelope.v1"

assert status["marker"] == schema_candidate_marker
assert status["read_only"] is True

assert final_seal["marker"] == final_seal_marker
assert final_seal["read_only"] is True
assert final_seal["source"]["schema_candidate_marker"] == schema_candidate_marker

assert receipt["marker"] == marker
assert receipt["status"] == "hold"
assert receipt["public_surface"] is True
assert receipt["read_only"] is True
assert receipt["source"]["final_seal_marker"] == final_seal_marker
assert receipt["source"]["schema_candidate_marker"] == schema_candidate_marker

assert example["schema"] == "void.datanet.wc.agent_attestation_envelope.v1"
assert example["marker"] == schema_candidate_marker

required_top = [
    "schema",
    "attestation_id",
    "actor",
    "work_artifact",
    "evidence",
    "review",
    "work_credit_status",
    "boundary"
]
for key in required_top:
    assert key in schema["required"], key
    assert key in example, key

assert example["actor"]["actor_type"] in [
    "agent",
    "tool_runner",
    "script_runner",
    "human_reviewer",
    "operator_lane"
]
assert example["review"]["review_status"] in [
    "not_reviewed",
    "review_pending",
    "accepted",
    "rejected",
    "needs_more_evidence"
]
assert example["work_credit_status"]["award_state"] in [
    "none",
    "recommended",
    "approved_pending_ledger",
    "ledger_written",
    "rejected"
]
assert example["work_credit_status"]["work_credits_policy"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work"

for key, value in example["boundary"].items():
    if key == "schema_candidate_only":
        assert value is True, key
    else:
        assert value is False, key

for key, value in receipt["validation"].items():
    assert value is True, key

boundary = receipt["boundary"]
assert boundary["validation_receipt_only"] is True
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

print("agent_attestation_envelope_validation_receipt_binding_green=true")
PY

echo "== marker/source presence =="
for f in "$DOC" "$PUBLIC_JSON" "$PUBLIC_HTML" "$0"; do
  test -f "$f"
  grep -Fq "$MARKER" "$f"
done
grep -Fq "$FINAL_SEAL_MARKER" "$DOC"
grep -Fq "$FINAL_SEAL_MARKER" "$PUBLIC_JSON"
grep -Fq "$FINAL_SEAL_MARKER" "$FINAL_SEAL_JSON"
grep -Fq "$FINAL_SEAL_MARKER" "$FINAL_SEAL_HTML"
grep -Fq "$SCHEMA_CANDIDATE_MARKER" "$DOC"
grep -Fq "$SCHEMA_CANDIDATE_MARKER" "$PUBLIC_JSON"
grep -Fq "$SCHEMA_CANDIDATE_MARKER" "$EXAMPLE_JSON"
grep -Fq "$SCHEMA_CANDIDATE_MARKER" "$SCHEMA_STATUS_JSON"
echo "marker_source_green=true"

echo "== public static read-only scan =="
if grep -RInE '<form|method=|fetch\(|XMLHttpRequest|navigator\.|localStorage|sessionStorage|indexedDB|onclick=|onload=|<script' "$PUBLIC_JSON" "$PUBLIC_HTML" "$SCHEMA_JSON" "$EXAMPLE_JSON" "$SCHEMA_STATUS_JSON" "$FINAL_SEAL_JSON" "$FINAL_SEAL_HTML"; then
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
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$DOC" "$PUBLIC_JSON" "$PUBLIC_HTML" "$SCHEMA_JSON" "$EXAMPLE_JSON" "$SCHEMA_STATUS_JSON" "$FINAL_SEAL_JSON"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_VALIDATION_RECEIPT_HOLD_V1_GREEN"
