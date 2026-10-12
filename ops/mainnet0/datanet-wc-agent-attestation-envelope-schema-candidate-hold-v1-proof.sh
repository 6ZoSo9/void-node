#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_SCHEMA_CANDIDATE_HOLD_V1"
DOC="docs/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-hold-v1.md"
SCHEMA_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-hold-v1.schema.json"
EXAMPLE_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-example-hold-v1.json"
PUBLIC_JSON="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-hold-v1.json"
PUBLIC_HTML="public/public-node/work-credits/datanet-wc-agent-attestation-envelope-schema-candidate-hold-v1.html"

echo "== JSON parse / schema candidate binding =="
python3 - "$SCHEMA_JSON" "$EXAMPLE_JSON" "$PUBLIC_JSON" "$MARKER" <<'PY'
import json
import sys

schema_path, example_path, public_path, marker = sys.argv[1:5]

schema = json.load(open(schema_path, encoding="utf-8"))
example = json.load(open(example_path, encoding="utf-8"))
public = json.load(open(public_path, encoding="utf-8"))

assert schema["$id"] == "void.datanet.wc.agent_attestation_envelope.schema_candidate.v1"
assert schema["properties"]["schema"]["const"] == "void.datanet.wc.agent_attestation_envelope.v1"

assert example["schema"] == "void.datanet.wc.agent_attestation_envelope.v1"
assert example["marker"] == marker
assert example["work_credit_status"]["work_credits_policy"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work"

assert public["marker"] == marker
assert public["status"] == "hold"
assert public["public_surface"] is True
assert public["read_only"] is True

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
    assert key in example, key
    assert key in schema["required"], key

for key, value in example["boundary"].items():
    if key == "schema_candidate_only":
        assert value is True, key
    else:
        assert value is False, key

for key, value in public["boundary"].items():
    if key == "schema_candidate_only":
        assert value is True, key
    else:
        assert value is False, key

print("agent_attestation_envelope_schema_candidate_binding_green=true")
PY

echo "== marker presence =="
for f in "$DOC" "$EXAMPLE_JSON" "$PUBLIC_JSON" "$PUBLIC_HTML" "$0"; do
  test -f "$f"
  grep -Fq "$MARKER" "$f"
done
test -f "$SCHEMA_JSON"
echo "marker_green=true"

echo "== public static read-only scan =="
if grep -RInE '<form|method=|fetch\(|XMLHttpRequest|navigator\.|localStorage|sessionStorage|indexedDB|onclick=|onload=|<script' "$SCHEMA_JSON" "$EXAMPLE_JSON" "$PUBLIC_JSON" "$PUBLIC_HTML"; then
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
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$DOC" "$SCHEMA_JSON" "$EXAMPLE_JSON" "$PUBLIC_JSON" "$PUBLIC_HTML"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_AGENT_ATTESTATION_ENVELOPE_SCHEMA_CANDIDATE_HOLD_V1_GREEN"
