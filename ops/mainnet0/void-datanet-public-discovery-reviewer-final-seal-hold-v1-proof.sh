#!/usr/bin/env bash
set -euo pipefail

B="datanet-public-discovery-reviewer-final-seal-hold-v1"
M="VOID_DATANET_PUBLIC_DISCOVERY_REVIEWER_FINAL_SEAL_HOLD_V1"

PREV="datanet-public-discovery-closeout-rollup-html-card-runtime-visibility-hold-v1"
PREV_M="VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"

CARD="public/public-node/datanet/${B}.json"
INDEX="public/public-node/datanet/index.json"
DOC="docs/public-node/datanet/${B}.md"
PROOF="ops/mainnet0/void-${B}-proof.sh"
PREV_CARD="public/public-node/datanet/${PREV}.json"

echo "== json syntax =="
python3 -m json.tool "$CARD" >/dev/null
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$PREV_CARD" >/dev/null
echo "json_syntax_green=true"

echo "== contract check =="
python3 - <<'PY'
import json
from pathlib import Path

b = "datanet-public-discovery-reviewer-final-seal-hold-v1"
m = "VOID_DATANET_PUBLIC_DISCOVERY_REVIEWER_FINAL_SEAL_HOLD_V1"
prev = "datanet-public-discovery-closeout-rollup-html-card-runtime-visibility-hold-v1"
prev_m = "VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"

card = json.loads(Path(f"public/public-node/datanet/{b}.json").read_text())
idx = json.loads(Path("public/public-node/datanet/index.json").read_text())
prev_card = json.loads(Path(f"public/public-node/datanet/{prev}.json").read_text())

errors = []

must_false = [
    "public_intake_enabled",
    "upload_enabled",
    "object_write_enabled",
    "mirror_command_enabled",
    "peer_pin_command_enabled",
    "wc_claim_enabled",
    "wc_issuance_enabled",
    "wallet_or_signer_required",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
    "transaction_created",
    "transaction_signed",
    "transaction_broadcast",
    "void_transfer_enabled",
    "usdc_autofulfillment_enabled",
]

must_true = [
    "reviewer_final_seal_hold_only",
    "public_safe",
    "read_only",
    "discovery_only",
]

def find_id(node, wanted):
    found = []
    if isinstance(node, dict):
        if node.get("id") == wanted:
            found.append(node)
        for value in node.values():
            found.extend(find_id(value, wanted))
    elif isinstance(node, list):
        for item in node:
            found.extend(find_id(item, wanted))
    return found

index_hits = find_id(idx, b)
prev_index_hits = find_id(idx, prev)

if len(index_hits) != 1:
    errors.append(f"index entry count for {b} expected 1 got {len(index_hits)}")

if len(prev_index_hits) < 1:
    errors.append(f"previous sealed input missing from index: {prev}")

idx_entry = index_hits[0] if index_hits else {}

for name, obj in (("card", card), ("index_entry", idx_entry)):
    if obj.get("id") != b:
        errors.append(f"{name}.id mismatch")
    if obj.get("marker") != m:
        errors.append(f"{name}.marker mismatch")
    if obj.get("status") != "hold":
        errors.append(f"{name}.status must be hold")
    if obj.get("path") != f"/public-node/datanet/{b}.json":
        errors.append(f"{name}.path mismatch")
    if obj.get("json") != f"{b}.json":
        errors.append(f"{name}.json mismatch")

    for key in must_true:
        if obj.get(key) is not True:
            errors.append(f"{name}.{key} must be true")

    for key in must_false:
        if obj.get(key) is not False:
            errors.append(f"{name}.{key} must be false")

if card.get("runtime_fetch_required") is not False:
    errors.append("card.runtime_fetch_required must be false")

if card.get("runtime_fetch_optional") is not True:
    errors.append("card.runtime_fetch_optional must be true")

sealed_inputs = card.get("sealed_inputs")
if not isinstance(sealed_inputs, list) or not any(
    isinstance(x, dict) and x.get("id") == prev and x.get("marker") == prev_m
    for x in sealed_inputs
):
    errors.append("sealed input binding missing or malformed")

if prev_card.get("marker") != prev_m:
    errors.append("previous sealed input marker mismatch")

boundary = card.get("boundary")
if not isinstance(boundary, dict):
    errors.append("boundary missing")
else:
    for key in (
        "public_discovery_status_only",
        "final_seal_visibility_only",
        "no_public_intake",
        "no_upload",
        "no_object_write",
        "no_mirror_command",
        "no_peer_pin_command",
        "no_wc_claim",
        "no_wc_issuance",
        "no_wallet_or_signer",
        "no_runtime_mutation_route",
        "no_mutation_handler",
    ):
        if boundary.get(key) is not True:
            errors.append(f"boundary.{key} must be true")

if errors:
    print("contract_green=false")
    for err in errors:
        print(f"ERROR: {err}")
    raise SystemExit(1)

print("contract_green=true")
PY

echo "== marker binding =="
grep -F "$M" "$CARD" >/dev/null
grep -F "$M" "$INDEX" >/dev/null
grep -F "$M" "$DOC" >/dev/null
grep -F "$M" "$PROOF" >/dev/null
grep -F "$PREV_M" "$PREV_CARD" >/dev/null
echo "marker_binding_green=true"

echo "== junk paste scan =="
if grep -R --line-number 'public-node/datanet/${B}.json"-files=all' "$CARD" "$INDEX" "$DOC"; then
  echo "junk_paste_scan_green=false"
  exit 1
fi
echo "junk_paste_scan_green=true"

echo "== public safety scan =="
if grep -R --line-number "$M" src docs/private fixtures/private 2>/tmp/void-${B}-leak-scan.log; then
  echo "private_or_runtime_marker_leak_absent=false"
  exit 1
fi
echo "private_or_runtime_marker_leak_absent=true"

echo "${M}_GREEN"
