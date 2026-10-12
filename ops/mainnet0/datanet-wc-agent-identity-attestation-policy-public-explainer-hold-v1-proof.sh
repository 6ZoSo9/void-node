#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_AGENT_IDENTITY_ATTESTATION_POLICY_PUBLIC_EXPLAINER_HOLD_V1"
DOC="docs/work-credits/datanet-wc-agent-identity-attestation-policy-public-explainer-hold-v1.md"
PUBLIC_JSON="public/public-node/work-credits/datanet-wc-agent-identity-attestation-policy-public-explainer-hold-v1.json"
PUBLIC_HTML="public/public-node/work-credits/datanet-wc-agent-identity-attestation-policy-public-explainer-hold-v1.html"

echo "== JSON parse / agent identity attestation policy binding =="
python3 - "$PUBLIC_JSON" "$MARKER" <<'PY'
import json
import sys

path, marker = sys.argv[1], sys.argv[2]
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

assert data["marker"] == marker
assert data["status"] == "hold"
assert data["public_surface"] is True
assert data["read_only"] is True

policy = data["policy"]
assert policy["work_credits"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work"
assert policy["issuance_gate"] == "review_operator_protocol_rules_required_before_any_award"

boundary = data["boundary"]
for key in [
    "identity_registry_write_enabled",
    "public_mutation_enabled",
    "agent_self_issuance_enabled",
    "automatic_wc_award_enabled",
    "wc_issuance_enabled",
    "wc_ledger_write_enabled",
    "reviewer_staking_enabled",
    "void_transfer_enabled",
    "wallet_path_enabled",
    "signer_path_enabled"
]:
    assert boundary[key] is False, key

chain = data["artifact_chain"]
for required in [
    "actor_identity_envelope",
    "submitted_work_artifact",
    "replayable_proof_or_evidence_packet",
    "reviewer_operator_decision_pointer",
    "later_award_or_rejection_status"
]:
    assert required in chain, required

print("agent_identity_attestation_policy_binding_green=true")
PY

echo "== marker presence =="
for f in "$DOC" "$PUBLIC_JSON" "$PUBLIC_HTML" "$0"; do
  test -f "$f"
  grep -Fq "$MARKER" "$f"
done
echo "marker_green=true"

echo "== public static read-only scan =="
if grep -RInE '<form|method=|fetch\(|XMLHttpRequest|navigator\.|localStorage|sessionStorage|indexedDB|POST|PUT|PATCH|DELETE|onclick=|onload=|<script' "$PUBLIC_JSON" "$PUBLIC_HTML"; then
  echo "public_static_readonly_scan_green=false"
  exit 1
fi
echo "public_static_readonly_scan_green=true"

echo "== authority boundary scan =="
grep -Fq '"identity_registry_write_enabled": false' "$PUBLIC_JSON"
grep -Fq '"agent_self_issuance_enabled": false' "$PUBLIC_JSON"
grep -Fq '"automatic_wc_award_enabled": false' "$PUBLIC_JSON"
grep -Fq '"wc_issuance_enabled": false' "$PUBLIC_JSON"
grep -Fq '"wc_ledger_write_enabled": false' "$PUBLIC_JSON"
grep -Fq '"reviewer_staking_enabled": false' "$PUBLIC_JSON"
grep -Fq '"void_transfer_enabled": false' "$PUBLIC_JSON"
grep -Fq '"wallet_path_enabled": false' "$PUBLIC_JSON"
grep -Fq '"signer_path_enabled": false' "$PUBLIC_JSON"
echo "authority_boundary_green=true"

echo "== forbidden WC cap wording scan =="
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$DOC" "$PUBLIC_JSON" "$PUBLIC_HTML"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_AGENT_IDENTITY_ATTESTATION_POLICY_PUBLIC_EXPLAINER_HOLD_V1_GREEN"
