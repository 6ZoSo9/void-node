#!/usr/bin/env bash
set -euo pipefail

n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-node-reviewer-closeout-index-link-v1

doc="docs/public/$n.md"
fixture="fixtures/public/$n.json"

source_n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-html-runtime-live-verification-hold-v1
source_proof="ops/mainnet0/$source_n-proof.sh"

root_index="public/public-node/index.json"
pool_index="public/public-node/usdc-void-buy-pool/index.json"

bundle_html_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.html"
bundle_json_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.json"
pool_index_route="/public-node/usdc-void-buy-pool/index.json"
status_json_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"
status_html_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html"

bundle_html_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.html"
bundle_json_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.json"
status_json_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"
status_html_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_NODE_REVIEWER_CLOSEOUT_INDEX_LINK_V1"
source_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_REVIEWER_CLOSEOUT_BUNDLE_HTML_RUNTIME_LIVE_VERIFICATION_HOLD_V1"
bundle_html_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_REVIEWER_CLOSEOUT_BUNDLE_HTML_V1"
bundle_json_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_REVIEWER_CLOSEOUT_BUNDLE_V1"
status_json_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_V1"
status_html_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_HTML_DISCOVERY_V1"
status="canary_separate_terminal_lane_closed_without_execution"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$source_proof"
test -f "$root_index"
test -f "$pool_index"
test -f "$bundle_html_file"
test -f "$bundle_json_file"
test -f "$status_json_file"
test -f "$status_html_file"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_files_exist=true"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"
grep -q "$source_marker" "$fixture"
grep -q "$bundle_html_marker" "$bundle_html_file"
grep -q "$bundle_json_marker" "$bundle_json_file"
grep -q "$status_json_marker" "$status_json_file"
grep -q "$status_html_marker" "$status_html_file"
grep -q "$bundle_html_route" "$root_index"
grep -q "$bundle_json_route" "$root_index"
grep -q "$pool_index_route" "$root_index"
grep -q "$status_json_route" "$root_index"
grep -q "$status_html_route" "$root_index"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_marker_green=true"

if grep -nE '(_PUSHED"|_GREEN"|PROOF_BEGIN|automatic_payment_canary_|^== source |allocation_record_hash=)' "$doc"; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_doc_terminal_output_contamination_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_doc_terminal_output_contamination_absent=true"

python3 - "$fixture" "$root_index" "$pool_index" "$bundle_html_file" "$bundle_json_file" "$status_json_file" "$status_html_file" "$marker" "$source_marker" "$bundle_html_marker" "$bundle_json_marker" "$status_json_marker" "$status_html_marker" "$bundle_html_route" "$bundle_json_route" "$pool_index_route" "$status_json_route" "$status_html_route" "$status" <<'PY'
import json
import sys
from pathlib import Path

(
    fixture_path,
    root_index,
    pool_index,
    bundle_html_file,
    bundle_json_file,
    status_json_file,
    status_html_file,
    marker,
    source_marker,
    bundle_html_marker,
    bundle_json_marker,
    status_json_marker,
    status_html_marker,
    bundle_html_route,
    bundle_json_route,
    pool_index_route,
    status_json_route,
    status_html_route,
    expected_status,
) = sys.argv[1:]

with open(fixture_path, "r", encoding="utf-8") as f:
    fixture = json.load(f)

with open(root_index, "r", encoding="utf-8") as f:
    root = json.load(f)

with open(pool_index, "r", encoding="utf-8") as f:
    pool = json.load(f)

bundle_html = Path(bundle_html_file).read_text(encoding="utf-8")

with open(bundle_json_file, "r", encoding="utf-8") as f:
    bundle = json.load(f)

with open(status_json_file, "r", encoding="utf-8") as f:
    status_json = json.load(f)

status_html = Path(status_html_file).read_text(encoding="utf-8")

assert fixture["marker"] == marker
assert fixture["kind"] == "public_node_reviewer_closeout_index_link"
assert fixture["root_index"] == root_index
assert fixture["pool_index"] == pool_index
assert fixture["primary_reviewer_route"] == bundle_html_route
assert fixture["json_reviewer_bundle_route"] == bundle_json_route
assert fixture["status_json_route"] == status_json_route
assert fixture["status_html_route"] == status_html_route
assert fixture["method"] == "GET"
assert fixture["read_only"] is True
assert fixture["public_safe"] is True
assert fixture["discoverable_from_root_public_node_index"] is True
assert fixture["status"] == expected_status
assert fixture["closed_without_execution"] is True
assert fixture["source_runtime_hold_marker"] == source_marker

assert root["read_only"] is True
assert root["public_safe"] is True
assert any(
    isinstance(r, dict)
    and r.get("route") == bundle_html_route
    and r.get("json_route") == bundle_json_route
    and r.get("pool_index_route") == pool_index_route
    and r.get("status_json_route") == status_json_route
    and r.get("status_html_route") == status_html_route
    and r.get("method") == "GET"
    and r.get("kind") == "public_reviewer_closeout_bundle_html"
    and r.get("status") == expected_status
    and r.get("closed_without_execution") is True
    and r.get("read_only") is True
    and r.get("public_safe") is True
    for r in root["routes"]
)

assert pool["read_only"] is True
assert pool["public_safe"] is True
assert any(
    isinstance(r, dict)
    and r.get("route") == bundle_html_route
    and r.get("json_route") == bundle_json_route
    and r.get("method") == "GET"
    and r.get("kind") == "public_reviewer_closeout_bundle_html"
    and r.get("status") == expected_status
    and r.get("closed_without_execution") is True
    and r.get("read_only") is True
    and r.get("public_safe") is True
    for r in pool["routes"]
)

assert bundle_html_marker in bundle_html
assert bundle_json_route in bundle_html
assert status_json_route in bundle_html
assert status_html_route in bundle_html
assert expected_status in bundle_html

assert bundle["marker"] == bundle_json_marker
assert bundle["status"] == expected_status
assert bundle["closed_without_execution"] is True
assert bundle["read_only"] is True
assert bundle["public_safe"] is True

assert status_json["marker"] == status_json_marker
assert status_json["status"] == expected_status
assert status_json["closed_without_execution"] is True
assert status_json["public_safe"] is True

assert status_html_marker in status_html
assert expected_status in status_html

for key in [
    "private_material_exposed",
    "canonical_payment_identity_exposed",
    "allocation_record_hash_exposed",
    "operator_only_paths_exposed",
    "wallet_secret_exposed",
    "wallet_address_exposed",
    "private_key_exposed",
    "seed_phrase_exposed",
]:
    assert fixture[key] is False, key

for key, value in fixture["authority"].items():
    assert value is False, key

for key in [
    "terminal_execute_authorized",
    "actual_execute_authorized",
    "signer_access_granted",
    "execution_performed",
    "signing_performed",
    "void_transfer_performed",
    "transaction_broadcast",
    "fulfilled_state_written",
    "public_mutation_route_created",
    "terminal_lane_reopened",
]:
    assert bundle["boundary"][key] is False, key
    assert status_json["authority"][key] is False, key
PY

echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_fixture_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_root_index_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_pool_index_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_bundle_html_binding_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_bundle_json_binding_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_status_json_binding_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_status_html_binding_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_read_only_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_authority_boundary_green=true"

echo
echo "== source reviewer bundle HTML runtime hold proof remains green =="
bash "$source_proof"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_source_runtime_hold_green=true"

if grep -RInE 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_ROLLUP_HOLD_V1|docs/private|fixtures/private|ops/private' "$doc" "$fixture" "$root_index" "$pool_index" "$bundle_json_file" "$bundle_html_file" "$status_json_file" "$status_html_file" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_private_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_private_leak_absent=true"

if grep -RInE '[a-fA-F0-9]{64}' "$doc" "$fixture" "$root_index" "$pool_index" "$bundle_json_file" "$bundle_html_file" "$status_json_file" "$status_html_file" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_raw_hash_or_key_like_hex_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_raw_hash_or_key_like_hex_absent=true"

if grep -RInE '(canonical_payment_identity|allocation_record_hash|private[_ -]?key|seed[_ -]?phrase|wallet[_ -]?secret)[[:space:]]*[:=]' "$doc" "$fixture" "$root_index" "$pool_index" "$bundle_json_file" "$bundle_html_file" "$status_json_file" "$status_html_file" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_secret_assignment_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_secret_assignment_leak_absent=true"

if grep -RInE 'app\.(post|put|patch|delete)|router\.(post|put|patch|delete)|method[[:space:]]*:[[:space:]]*"(POST|PUT|PATCH|DELETE)"|public_mutation_route_created[[:space:]]*:[[:space:]]*true' "$doc" "$fixture" "$root_index" "$pool_index" "$bundle_json_file" "$bundle_html_file" "$status_json_file" "$status_html_file" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_public_mutation_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_public_mutation_absent=true"

echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_no_terminal_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_no_actual_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_no_signer_access=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_no_execution=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_no_signing=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_no_transfer=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_no_broadcast=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_no_fulfilled_state=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_index_link_no_terminal_lane_reopen=true"

echo "${marker}_GREEN"
