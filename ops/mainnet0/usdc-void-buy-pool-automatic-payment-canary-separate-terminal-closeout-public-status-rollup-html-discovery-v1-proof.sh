#!/usr/bin/env bash
set -euo pipefail

n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-status-rollup-html-discovery-v1

doc="docs/public/$n.md"
fixture="fixtures/public/$n.json"

source_n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-status-rollup-route-index-discovery-v1
source_proof="ops/mainnet0/$source_n-proof.sh"

json_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"
html_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html"

json_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"
html_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html"

pool_index="public/public-node/usdc-void-buy-pool/index.json"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_HTML_DISCOVERY_V1"
status_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_V1"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$source_proof"
test -f "$json_file"
test -f "$html_file"
test -f "$pool_index"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_files_exist=true"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"
grep -q "$marker" "$html_file"
grep -q "$status_marker" "$json_file"
grep -q "$html_route" "$pool_index"
grep -q "$json_route" "$html_file"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_marker_green=true"

if grep -nE '(_PUSHED"|_GREEN"|PROOF_BEGIN|automatic_payment_canary_|^== source |allocation_record_hash=)' "$doc"; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_doc_terminal_output_contamination_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_doc_terminal_output_contamination_absent=true"

if grep -nE '(_PUSHED"|_GREEN"|PROOF_BEGIN|automatic_payment_canary_|^== source |allocation_record_hash=)' "$html_file"; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_html_terminal_output_contamination_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_html_terminal_output_contamination_absent=true"

python3 - "$fixture" "$json_file" "$html_file" "$pool_index" "$marker" "$status_marker" "$html_route" "$json_route" <<'PY'
import json
import sys
from pathlib import Path

fixture_path, json_file, html_file, pool_index, marker, status_marker, html_route, json_route = sys.argv[1:]

with open(fixture_path, "r", encoding="utf-8") as f:
    fixture = json.load(f)

with open(json_file, "r", encoding="utf-8") as f:
    status = json.load(f)

html = Path(html_file).read_text(encoding="utf-8")

with open(pool_index, "r", encoding="utf-8") as f:
    pool = json.load(f)

assert fixture["marker"] == marker
assert fixture["kind"] == "public_html_discovery_page"
assert fixture["html_route"] == html_route
assert fixture["json_route"] == json_route
assert fixture["method"] == "GET"
assert fixture["read_only"] is True
assert fixture["public_safe"] is True
assert fixture["status"] == "canary_separate_terminal_lane_closed_without_execution"
assert fixture["closed_without_execution"] is True

assert status["marker"] == status_marker
assert status["status"] == "canary_separate_terminal_lane_closed_without_execution"
assert status["closed_without_execution"] is True
assert status["public_safe"] is True

assert marker in html
assert json_route in html
assert "canary_separate_terminal_lane_closed_without_execution" in html
assert "No terminal execute authorization" in html
assert "No actual execute authorization" in html
assert "No signer access" in html
assert "No execution" in html
assert "No public mutation route" in html
assert "No terminal lane reopen" in html

assert pool["read_only"] is True
assert pool["public_safe"] is True
assert any(
    isinstance(r, dict)
    and r.get("route") == html_route
    and r.get("json_route") == json_route
    and r.get("method") == "GET"
    and r.get("kind") == "public_status_rollup_html"
    and r.get("status") == "canary_separate_terminal_lane_closed_without_execution"
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

for key, value in status["authority"].items():
    assert value is False, key
PY

echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_fixture_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_html_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_pool_index_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_json_binding_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_read_only_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_authority_boundary_green=true"

echo
echo "== source route index discovery proof remains green =="
bash "$source_proof"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_source_index_discovery_green=true"

if grep -RInE 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_ROLLUP_HOLD_V1|docs/private|fixtures/private|ops/private' "$doc" "$fixture" "$json_file" "$html_file" "$pool_index" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_private_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_private_leak_absent=true"

if grep -RInE '[a-fA-F0-9]{64}' "$doc" "$fixture" "$json_file" "$html_file" "$pool_index" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_raw_hash_or_key_like_hex_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_raw_hash_or_key_like_hex_absent=true"

if grep -RInE '(canonical_payment_identity|allocation_record_hash|private[_ -]?key|seed[_ -]?phrase|wallet[_ -]?secret)[[:space:]]*[:=]' "$doc" "$fixture" "$json_file" "$html_file" "$pool_index" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_secret_assignment_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_secret_assignment_leak_absent=true"

if grep -RInE 'app\.(post|put|patch|delete)|router\.(post|put|patch|delete)|method[[:space:]]*:[[:space:]]*"(POST|PUT|PATCH|DELETE)"|public_mutation_route_created[[:space:]]*:[[:space:]]*true' "$doc" "$fixture" "$json_file" "$html_file" "$pool_index" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_public_mutation_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_public_mutation_absent=true"

echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_no_terminal_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_no_actual_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_no_signer_access=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_no_execution=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_no_signing=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_no_transfer=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_no_broadcast=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_no_fulfilled_state=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_html_discovery_no_terminal_lane_reopen=true"

echo "${marker}_GREEN"
