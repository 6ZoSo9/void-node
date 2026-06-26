#!/usr/bin/env bash
set -euo pipefail

n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-html-v1

doc="docs/public/$n.md"
fixture="fixtures/public/$n.json"

source_n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1
source_proof="ops/mainnet0/$source_n-proof.sh"

bundle_json_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.json"
bundle_html_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.html"

json_status_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"
html_status_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html"
pool_index_route="/public-node/usdc-void-buy-pool/index.json"
root_index_route="/public-node/index.json"

bundle_json_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.json"
bundle_html_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.html"
json_status_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"
html_status_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html"
pool_index="public/public-node/usdc-void-buy-pool/index.json"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_REVIEWER_CLOSEOUT_BUNDLE_HTML_V1"
bundle_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_REVIEWER_CLOSEOUT_BUNDLE_V1"
json_status_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_V1"
html_status_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_HTML_DISCOVERY_V1"
json_runtime_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_ROUTE_RUNTIME_LIVE_VERIFICATION_HOLD_V1"
html_runtime_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_HTML_RUNTIME_LIVE_VERIFICATION_HOLD_V1"
status="canary_separate_terminal_lane_closed_without_execution"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$source_proof"
test -f "$bundle_json_file"
test -f "$bundle_html_file"
test -f "$json_status_file"
test -f "$html_status_file"
test -f "$pool_index"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_files_exist=true"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"
grep -q "$marker" "$bundle_html_file"
grep -q "$bundle_marker" "$bundle_json_file"
grep -q "$json_status_marker" "$json_status_file"
grep -q "$html_status_marker" "$html_status_file"
grep -q "$json_runtime_marker" "$bundle_json_file"
grep -q "$html_runtime_marker" "$bundle_json_file"
grep -q "$bundle_html_route" "$pool_index"
grep -q "$bundle_json_route" "$bundle_html_file"
grep -q "$json_status_route" "$bundle_html_file"
grep -q "$html_status_route" "$bundle_html_file"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_marker_green=true"

if grep -nE '(_PUSHED"|_GREEN"|PROOF_BEGIN|automatic_payment_canary_|^== source |allocation_record_hash=)' "$doc"; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_doc_terminal_output_contamination_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_doc_terminal_output_contamination_absent=true"

if grep -nE '(_PUSHED"|_GREEN"|PROOF_BEGIN|automatic_payment_canary_|^== source |allocation_record_hash=)' "$bundle_html_file"; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_html_terminal_output_contamination_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_html_terminal_output_contamination_absent=true"

python3 - "$fixture" "$bundle_json_file" "$bundle_html_file" "$json_status_file" "$html_status_file" "$pool_index" "$marker" "$bundle_marker" "$json_status_marker" "$html_status_marker" "$json_runtime_marker" "$html_runtime_marker" "$bundle_html_route" "$bundle_json_route" "$json_status_route" "$html_status_route" "$pool_index_route" "$root_index_route" "$status" <<'PY'
import json
import sys
from pathlib import Path

(
    fixture_path,
    bundle_json_file,
    bundle_html_file,
    json_status_file,
    html_status_file,
    pool_index,
    marker,
    bundle_marker,
    json_status_marker,
    html_status_marker,
    json_runtime_marker,
    html_runtime_marker,
    bundle_html_route,
    bundle_json_route,
    json_status_route,
    html_status_route,
    pool_index_route,
    root_index_route,
    expected_status,
) = sys.argv[1:]

with open(fixture_path, "r", encoding="utf-8") as f:
    fixture = json.load(f)

with open(bundle_json_file, "r", encoding="utf-8") as f:
    bundle = json.load(f)

html = Path(bundle_html_file).read_text(encoding="utf-8")

with open(json_status_file, "r", encoding="utf-8") as f:
    status_data = json.load(f)

status_html = Path(html_status_file).read_text(encoding="utf-8")

with open(pool_index, "r", encoding="utf-8") as f:
    pool = json.load(f)

assert fixture["marker"] == marker
assert fixture["kind"] == "public_reviewer_closeout_bundle_html"
assert fixture["html_route"] == bundle_html_route
assert fixture["json_bundle_route"] == bundle_json_route
assert fixture["method"] == "GET"
assert fixture["read_only"] is True
assert fixture["public_safe"] is True
assert fixture["status"] == expected_status
assert fixture["closed_without_execution"] is True

assert bundle["marker"] == bundle_marker
assert bundle["status"] == expected_status
assert bundle["closed_without_execution"] is True
assert bundle["read_only"] is True
assert bundle["public_safe"] is True
assert bundle["included_public_routes"]["json_status_rollup"] == json_status_route
assert bundle["included_public_routes"]["html_status_page"] == html_status_route
assert bundle["runtime_holds"]["json_runtime_hold"]["marker"] == json_runtime_marker
assert bundle["runtime_holds"]["html_runtime_hold"]["marker"] == html_runtime_marker

assert marker in html
assert bundle_json_route in html
assert json_status_route in html
assert html_status_route in html
assert pool_index_route in html
assert root_index_route in html
assert expected_status in html
for phrase in [
    "No terminal execute authorization",
    "No actual execute authorization",
    "No signer access",
    "No execution",
    "No signing",
    "No transfer",
    "No broadcast",
    "No fulfilled state",
    "No public mutation route",
    "No terminal lane reopen",
]:
    assert phrase in html, phrase

assert status_data["marker"] == json_status_marker
assert status_data["status"] == expected_status
assert status_data["closed_without_execution"] is True
assert status_data["public_safe"] is True

assert html_status_marker in status_html
assert expected_status in status_html

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
    assert status_data["authority"][key] is False, key
PY

echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_fixture_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_page_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_json_bundle_binding_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_json_status_binding_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_status_html_binding_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_pool_index_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_hold_markers_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_read_only_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_authority_boundary_green=true"

echo
echo "== source public reviewer closeout bundle proof remains green =="
bash "$source_proof"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_source_bundle_green=true"

if grep -RInE 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_ROLLUP_HOLD_V1|docs/private|fixtures/private|ops/private' "$doc" "$fixture" "$bundle_json_file" "$bundle_html_file" "$json_status_file" "$html_status_file" "$pool_index" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_private_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_private_leak_absent=true"

if grep -RInE '[a-fA-F0-9]{64}' "$doc" "$fixture" "$bundle_json_file" "$bundle_html_file" "$json_status_file" "$html_status_file" "$pool_index" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_raw_hash_or_key_like_hex_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_raw_hash_or_key_like_hex_absent=true"

if grep -RInE '(canonical_payment_identity|allocation_record_hash|private[_ -]?key|seed[_ -]?phrase|wallet[_ -]?secret)[[:space:]]*[:=]' "$doc" "$fixture" "$bundle_json_file" "$bundle_html_file" "$json_status_file" "$html_status_file" "$pool_index" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_secret_assignment_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_secret_assignment_leak_absent=true"

if grep -RInE 'app\.(post|put|patch|delete)|router\.(post|put|patch|delete)|method[[:space:]]*:[[:space:]]*"(POST|PUT|PATCH|DELETE)"|public_mutation_route_created[[:space:]]*:[[:space:]]*true' "$doc" "$fixture" "$bundle_json_file" "$bundle_html_file" "$json_status_file" "$html_status_file" "$pool_index" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_public_mutation_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_public_mutation_absent=true"

echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_no_terminal_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_no_actual_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_no_signer_access=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_no_execution=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_no_signing=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_no_transfer=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_no_broadcast=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_no_fulfilled_state=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_no_terminal_lane_reopen=true"

echo "${marker}_GREEN"
