#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_AGENT_IDENTITY_ATTESTATION_POLICY_PUBLIC_EXPLAINER_INDEX_PATCH_HOLD_V1"
SOURCE_MARKER="VOID_DATANET_WC_AGENT_IDENTITY_ATTESTATION_POLICY_PUBLIC_EXPLAINER_HOLD_V1"

DOC="docs/work-credits/datanet-wc-agent-identity-attestation-policy-public-explainer-index-patch-hold-v1.md"
INDEX_JSON="public/public-node/work-credits/index.json"
SOURCE_JSON="public/public-node/work-credits/datanet-wc-agent-identity-attestation-policy-public-explainer-hold-v1.json"
SOURCE_HTML="public/public-node/work-credits/datanet-wc-agent-identity-attestation-policy-public-explainer-hold-v1.html"
PUBLIC_JSON="public/public-node/work-credits/datanet-wc-agent-identity-attestation-policy-public-explainer-index-patch-hold-v1.json"
PUBLIC_HTML="public/public-node/work-credits/datanet-wc-agent-identity-attestation-policy-public-explainer-index-patch-hold-v1.html"

echo "== JSON parse / index patch binding =="
python3 - "$INDEX_JSON" "$PUBLIC_JSON" "$SOURCE_JSON" "$MARKER" "$SOURCE_MARKER" <<'PY'
import json
import pathlib
import sys

index_path, public_path, source_path, marker, source_marker = sys.argv[1:6]

with open(index_path, "r", encoding="utf-8") as f:
    index_raw = f.read()
    index_data = json.loads(index_raw)

with open(public_path, "r", encoding="utf-8") as f:
    patch = json.load(f)

with open(source_path, "r", encoding="utf-8") as f:
    source = json.load(f)

assert patch["marker"] == marker
assert patch["source_marker"] == source_marker
assert patch["status"] == "hold"
assert patch["public_surface"] is True
assert patch["read_only"] is True
assert source["marker"] == source_marker
assert source["read_only"] is True

assert marker in index_raw
assert source_marker in index_raw
assert "datanet-wc-agent-identity-attestation-policy-public-explainer-hold-v1.json" in index_raw
assert "datanet-wc-agent-identity-attestation-policy-public-explainer-hold-v1.html" in index_raw

boundary = patch["boundary"]
assert boundary["index_discovery_only"] is True
for key in [
    "identity_registry_write_enabled",
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

print("agent_identity_attestation_policy_index_patch_binding_green=true")
PY

echo "== marker presence =="
for f in "$DOC" "$INDEX_JSON" "$PUBLIC_JSON" "$PUBLIC_HTML" "$0"; do
  test -f "$f"
  grep -Fq "$MARKER" "$f"
done
grep -Fq "$SOURCE_MARKER" "$INDEX_JSON"
grep -Fq "$SOURCE_MARKER" "$SOURCE_JSON"
grep -Fq "$SOURCE_MARKER" "$SOURCE_HTML"
echo "marker_green=true"

echo "== public static read-only scan =="
if grep -RInE '<form|method=|fetch\(|XMLHttpRequest|navigator\.|localStorage|sessionStorage|indexedDB|onclick=|onload=|<script' "$PUBLIC_JSON" "$PUBLIC_HTML"; then
  echo "public_static_readonly_scan_green=false"
  exit 1
fi
echo "public_static_readonly_scan_green=true"

echo "== authority boundary scan =="
grep -Fq '"identity_registry_write_enabled": false' "$PUBLIC_JSON"
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
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$DOC" "$PUBLIC_JSON" "$PUBLIC_HTML" "$INDEX_JSON"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_AGENT_IDENTITY_ATTESTATION_POLICY_PUBLIC_EXPLAINER_INDEX_PATCH_HOLD_V1_GREEN"
