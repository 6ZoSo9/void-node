#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_AGENT_IDENTITY_ATTESTATION_POLICY_PUBLIC_EXPLAINER_INDEX_PATCH_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
INDEX_PATCH_MARKER="VOID_DATANET_WC_AGENT_IDENTITY_ATTESTATION_POLICY_PUBLIC_EXPLAINER_INDEX_PATCH_HOLD_V1"
EXPLAINER_MARKER="VOID_DATANET_WC_AGENT_IDENTITY_ATTESTATION_POLICY_PUBLIC_EXPLAINER_HOLD_V1"

DOC="docs/work-credits/datanet-wc-agent-identity-attestation-policy-public-explainer-index-patch-closeout-audit-rollup-hold-v1.md"
INDEX_JSON="public/public-node/work-credits/index.json"
INDEX_PATCH_JSON="public/public-node/work-credits/datanet-wc-agent-identity-attestation-policy-public-explainer-index-patch-hold-v1.json"
INDEX_PATCH_HTML="public/public-node/work-credits/datanet-wc-agent-identity-attestation-policy-public-explainer-index-patch-hold-v1.html"
EXPLAINER_JSON="public/public-node/work-credits/datanet-wc-agent-identity-attestation-policy-public-explainer-hold-v1.json"
EXPLAINER_HTML="public/public-node/work-credits/datanet-wc-agent-identity-attestation-policy-public-explainer-hold-v1.html"
PUBLIC_JSON="public/public-node/work-credits/datanet-wc-agent-identity-attestation-policy-public-explainer-index-patch-closeout-audit-rollup-hold-v1.json"
PUBLIC_HTML="public/public-node/work-credits/datanet-wc-agent-identity-attestation-policy-public-explainer-index-patch-closeout-audit-rollup-hold-v1.html"

echo "== JSON parse / closeout audit rollup binding =="
python3 - "$PUBLIC_JSON" "$INDEX_JSON" "$INDEX_PATCH_JSON" "$EXPLAINER_JSON" "$MARKER" "$INDEX_PATCH_MARKER" "$EXPLAINER_MARKER" <<'PY'
import json
import sys

public_path, index_path, index_patch_path, explainer_path, marker, index_patch_marker, explainer_marker = sys.argv[1:8]

with open(public_path, "r", encoding="utf-8") as f:
    closeout = json.load(f)

with open(index_path, "r", encoding="utf-8") as f:
    index_raw = f.read()
    json.loads(index_raw)

with open(index_patch_path, "r", encoding="utf-8") as f:
    index_patch = json.load(f)

with open(explainer_path, "r", encoding="utf-8") as f:
    explainer = json.load(f)

assert closeout["marker"] == marker
assert closeout["status"] == "hold"
assert closeout["public_surface"] is True
assert closeout["read_only"] is True

source = closeout["source"]
assert source["index_patch_marker"] == index_patch_marker
assert source["explainer_marker"] == explainer_marker
assert index_patch["marker"] == index_patch_marker
assert explainer["marker"] == explainer_marker

assert index_patch_marker in index_raw
assert explainer_marker in index_raw

audit = closeout["audit"]
for key in [
    "explainer_exists",
    "index_patch_exists",
    "index_binds_index_patch_marker",
    "index_binds_explainer_marker",
    "public_static_read_only",
    "work_credits_unlimited_uncapped",
    "no_authority_or_mutation_activated"
]:
    assert audit[key] is True, key

boundary = closeout["boundary"]
assert boundary["closeout_audit_rollup_only"] is True
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

print("agent_identity_attestation_policy_index_patch_closeout_binding_green=true")
PY

echo "== marker/source presence =="
for f in "$DOC" "$PUBLIC_JSON" "$PUBLIC_HTML" "$0"; do
  test -f "$f"
  grep -Fq "$MARKER" "$f"
done
grep -Fq "$INDEX_PATCH_MARKER" "$INDEX_JSON"
grep -Fq "$INDEX_PATCH_MARKER" "$INDEX_PATCH_JSON"
grep -Fq "$INDEX_PATCH_MARKER" "$INDEX_PATCH_HTML"
grep -Fq "$EXPLAINER_MARKER" "$INDEX_JSON"
grep -Fq "$EXPLAINER_MARKER" "$EXPLAINER_JSON"
grep -Fq "$EXPLAINER_MARKER" "$EXPLAINER_HTML"
echo "marker_source_green=true"

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
echo "VOID_DATANET_WC_AGENT_IDENTITY_ATTESTATION_POLICY_PUBLIC_EXPLAINER_INDEX_PATCH_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN"
