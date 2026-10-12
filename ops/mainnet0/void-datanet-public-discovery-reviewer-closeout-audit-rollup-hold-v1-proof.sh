#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-public-discovery-reviewer-closeout-audit-rollup-hold-v1"
MARKER="VOID_DATANET_PUBLIC_DISCOVERY_REVIEWER_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"

ROOT="public/public-node/index.json"
INDEX="public/public-node/datanet/index.json"
ROLLUP="public/public-node/datanet/${BRICK}.json"
DOC="docs/public-node/datanet/${BRICK}.md"
PROOF="ops/mainnet0/void-${BRICK}-proof.sh"

echo "== JSON parse =="
python3 -m json.tool "$ROOT" >/dev/null
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$ROLLUP" >/dev/null
echo "json_green=true"

echo "== file presence =="
test -f "$DOC"
test -f "$PROOF"
echo "files_green=true"

echo "== closeout rollup binding =="
python3 - <<'PY'
import json
from pathlib import Path

brick = "datanet-public-discovery-reviewer-closeout-audit-rollup-hold-v1"
marker = "VOID_DATANET_PUBLIC_DISCOVERY_REVIEWER_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"

root = json.loads(Path("public/public-node/index.json").read_text())
idx = json.loads(Path("public/public-node/datanet/index.json").read_text())
rollup = json.loads(Path(f"public/public-node/datanet/{brick}.json").read_text())

root_routes = [r for r in root.get("routes", []) if r.get("route") == "/public-node/datanet/index.json"]
assert len(root_routes) == 1
assert root_routes[0]["public_safe"] is True
assert root_routes[0]["read_only"] is True
assert root_routes[0]["discovery_only"] is True
assert root_routes[0]["runtime_mutation_route_enabled"] is False
assert root_routes[0]["mutation_handler_enabled"] is False

assert idx["schema"] == "void.public_node.datanet.index.v1"
assert idx["status"] == "hold"

entries = {e["id"]: e for e in idx.get("entries", [])}
assert brick in entries
entry = entries[brick]

assert entry["status"] == "hold"
assert entry["path"] == f"/public-node/datanet/{brick}.json"
assert entry["json"] == f"{brick}.json"
assert entry["scope"] == "datanet_public_discovery_reviewer_closeout_audit_rollup"
assert entry["reviewer_closeout_audit_rollup_hold_only"] is True
assert entry["public_safe"] is True
assert entry["read_only"] is True
assert entry["discovery_only"] is True
assert entry["root_public_node_route_required"] is True
assert entry["datanet_index_required"] is True
assert entry["proof_stack_required"] is True
assert entry["runtime_fetch_required"] is False
assert entry["runtime_fetch_optional"] is True
assert entry["marker"] == marker

for key in [
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
]:
    assert entry[key] is False, key

assert rollup["schema"] == "void.public_node.datanet.public_discovery_reviewer_closeout_audit_rollup.v1"
assert rollup["id"] == brick
assert rollup["status"] == "hold"
assert rollup["marker"] == marker
assert rollup["scope"] == "datanet_public_discovery_reviewer_closeout_audit_rollup"
assert rollup["root_public_node_route"] == "/public-node/datanet/index.json"
assert rollup["datanet_public_node_index"] == "/public-node/datanet/index.json"

expected = {
    "datanet-public-discovery-closeout-rollup-hold-v1": "VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HOLD_V1_GREEN",
    "datanet-public-discovery-closeout-rollup-html-card-hold-v1": "VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1_GREEN",
    "datanet-public-discovery-closeout-rollup-html-card-runtime-visibility-hold-v1": "VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN",
    "datanet-public-discovery-reviewer-final-seal-hold-v1": "VOID_DATANET_PUBLIC_DISCOVERY_REVIEWER_FINAL_SEAL_HOLD_V1_GREEN",
    "datanet-public-discovery-reviewer-final-seal-html-card-hold-v1": "VOID_DATANET_PUBLIC_DISCOVERY_REVIEWER_FINAL_SEAL_HTML_CARD_HOLD_V1_GREEN",
    "datanet-public-discovery-reviewer-final-seal-html-card-runtime-visibility-hold-v1": "VOID_DATANET_PUBLIC_DISCOVERY_REVIEWER_FINAL_SEAL_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN",
}
sealed = {e["id"]: e for e in rollup["sealed_entries"]}
assert set(sealed) == set(expected)
for sid, marker_value in expected.items():
    assert sealed[sid]["proof_marker"] == marker_value
    assert sealed[sid]["path"].startswith("/public-node/")

state = rollup["closeout_state"]
for key in [
    "root_public_node_route_present",
    "datanet_public_node_index_present",
    "browser_visible_onboarding_card_present",
    "browser_visible_final_seal_card_present",
    "runtime_visibility_metadata_present",
    "final_seal_present",
    "runtime_fetch_optional",
]:
    assert state[key] is True, key

assert state["runtime_fetch_required"] is False

for key in [
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
]:
    assert state[key] is False, key

for key, value in rollup["public_safety"].items():
    assert value is False, key

print("datanet_public_discovery_reviewer_closeout_audit_rollup_binding_green=true")
PY

echo "== component proof stack =="
declare -A PROOFS=(
  [VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-public-discovery-closeout-rollup-hold-v1-proof.sh"
  [VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-public-discovery-closeout-rollup-html-card-hold-v1-proof.sh"
  [VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-public-discovery-closeout-rollup-html-card-runtime-visibility-hold-v1-proof.sh"
  [VOID_DATANET_PUBLIC_DISCOVERY_REVIEWER_FINAL_SEAL_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-public-discovery-reviewer-final-seal-hold-v1-proof.sh"
  [VOID_DATANET_PUBLIC_DISCOVERY_REVIEWER_FINAL_SEAL_HTML_CARD_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-public-discovery-reviewer-final-seal-html-card-hold-v1-proof.sh"
  [VOID_DATANET_PUBLIC_DISCOVERY_REVIEWER_FINAL_SEAL_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-public-discovery-reviewer-final-seal-html-card-runtime-visibility-hold-v1-proof.sh"
)
for marker in "${!PROOFS[@]}"; do
  out=".runtime/mainnet0/${BRICK}.${marker}.log"
  mkdir -p .runtime/mainnet0
  bash "${PROOFS[$marker]}" >"$out" 2>&1
  grep -F "$marker" "$out" >/dev/null
done
echo "component_proof_stack_green=true"

echo "== marker presence =="
grep -R "$MARKER" "$INDEX" "$ROLLUP" "$DOC" "$PROOF" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement scan =="
python3 - <<'PY'
from pathlib import Path

paths = [
    Path("public/public-node/datanet/index.json"),
    Path("public/public-node/datanet/datanet-public-discovery-reviewer-closeout-audit-rollup-hold-v1.json"),
    Path("docs/public-node/datanet/datanet-public-discovery-reviewer-closeout-audit-rollup-hold-v1.md"),
]

bad = [
    '"public_intake_enabled": true',
    '"upload_enabled": true',
    '"object_write_enabled": true',
    '"mirror_command_enabled": true',
    '"peer_pin_command_enabled": true',
    '"wc_claim_enabled": true',
    '"wc_issuance_enabled": true',
    '"wallet_or_signer_required": true',
    '"runtime_mutation_route_enabled": true',
    '"mutation_handler_enabled": true',
    '"public_mutation_enabled": true',
    '"runtime_route_enabled": true',
    '"contains_private_operator_material": true',
    '"contains_wallet_material": true',
    '"contains_secret_material": true',
]

hits = []
for path in paths:
    text = path.read_text()
    for needle in bad:
        if needle in text:
            hits.append(f"{path}:{needle}")

if hits:
    print("\n".join(hits))
    raise SystemExit("forbidden_enablement_scan_green=false")

print("forbidden_enablement_scan_green=true")
PY

echo "== result =="
echo "VOID_DATANET_PUBLIC_DISCOVERY_REVIEWER_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN"
