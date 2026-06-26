#!/usr/bin/env bash
set -euo pipefail

n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-html-runtime-live-verification-hold-v1

doc="docs/public/$n.md"
fixture="fixtures/public/$n.json"

source_n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-html-v1
source_proof="ops/mainnet0/$source_n-proof.sh"

bundle_html_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.html"
bundle_json_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.json"
json_status_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"
html_status_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html"
pool_index_route="/public-node/usdc-void-buy-pool/index.json"
root_index_route="/public-node/index.json"

bundle_html_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.html"
bundle_json_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.json"
json_status_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"
html_status_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html"
pool_index="public/public-node/usdc-void-buy-pool/index.json"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_REVIEWER_CLOSEOUT_BUNDLE_HTML_RUNTIME_LIVE_VERIFICATION_HOLD_V1"
html_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_REVIEWER_CLOSEOUT_BUNDLE_HTML_V1"
bundle_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_REVIEWER_CLOSEOUT_BUNDLE_V1"
json_status_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_V1"
html_status_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_HTML_DISCOVERY_V1"
status="canary_separate_terminal_lane_closed_without_execution"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$source_proof"
test -f "$bundle_html_file"
test -f "$bundle_json_file"
test -f "$json_status_file"
test -f "$html_status_file"
test -f "$pool_index"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_files_exist=true"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"
grep -q "$html_marker" "$bundle_html_file"
grep -q "$bundle_marker" "$bundle_json_file"
grep -q "$json_status_marker" "$json_status_file"
grep -q "$html_status_marker" "$html_status_file"
grep -q "$bundle_html_route" "$pool_index"
grep -q "$bundle_json_route" "$bundle_html_file"
grep -q "$json_status_route" "$bundle_html_file"
grep -q "$html_status_route" "$bundle_html_file"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_marker_green=true"

if grep -nE '(_PUSHED"|_GREEN"|PROOF_BEGIN|automatic_payment_canary_|^== source |allocation_record_hash=)' "$doc"; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_doc_terminal_output_contamination_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_doc_terminal_output_contamination_absent=true"

if grep -nE '(_PUSHED"|_GREEN"|PROOF_BEGIN|automatic_payment_canary_|^== source |allocation_record_hash=)' "$bundle_html_file"; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_html_terminal_output_contamination_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_html_terminal_output_contamination_absent=true"

python3 - "$fixture" "$bundle_html_file" "$bundle_json_file" "$json_status_file" "$html_status_file" "$pool_index" "$marker" "$html_marker" "$bundle_marker" "$json_status_marker" "$html_status_marker" "$bundle_html_route" "$bundle_json_route" "$json_status_route" "$html_status_route" "$pool_index_route" "$root_index_route" "$status" <<'PY'
import json
import sys
from pathlib import Path

(
    fixture_path,
    bundle_html_file,
    bundle_json_file,
    json_status_file,
    html_status_file,
    pool_index,
    marker,
    html_marker,
    bundle_marker,
    json_status_marker,
    html_status_marker,
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

html = Path(bundle_html_file).read_text(encoding="utf-8")

with open(bundle_json_file, "r", encoding="utf-8") as f:
    bundle = json.load(f)

with open(json_status_file, "r", encoding="utf-8") as f:
    status_data = json.load(f)

status_html = Path(html_status_file).read_text(encoding="utf-8")

with open(pool_index, "r", encoding="utf-8") as f:
    pool = json.load(f)

assert fixture["marker"] == marker
assert fixture["kind"] == "public_reviewer_closeout_bundle_html_runtime_live_verification_hold"
assert fixture["html_route"] == bundle_html_route
assert fixture["json_bundle_route"] == bundle_json_route
assert fixture["json_status_route"] == json_status_route
assert fixture["html_status_route"] == html_status_route
assert fixture["pool_index_route"] == pool_index_route
assert fixture["root_index_route"] == root_index_route
assert fixture["method"] == "GET"
assert fixture["read_only"] is True
assert fixture["public_safe"] is True
assert fixture["observation_only"] is True
assert fixture["runtime_check_optional"] is True
assert fixture["static_artifacts_remain_green_when_runtime_not_observed"] is True
assert fixture["status"] == expected_status
assert fixture["closed_without_execution"] is True
assert fixture["source_html_marker"] == html_marker
assert fixture["source_bundle_marker"] == bundle_marker

assert html_marker in html
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

assert bundle["marker"] == bundle_marker
assert bundle["status"] == expected_status
assert bundle["closed_without_execution"] is True
assert bundle["read_only"] is True
assert bundle["public_safe"] is True

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

echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_fixture_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_static_html_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_json_bundle_binding_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_json_status_binding_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_status_html_binding_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_pool_index_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_read_only_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_authority_boundary_green=true"

echo
echo "== source reviewer bundle HTML proof remains green =="
bash "$source_proof"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_source_bundle_html_green=true"

runtime_seen=false
for base in "http://127.0.0.1:3000" "http://127.0.0.1:4173" "http://127.0.0.1:8080" "http://127.0.0.1:8787"; do
  url="${base}${bundle_html_route}"
  if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "$url" > /tmp/void-reviewer-bundle-html-runtime-check.html 2>/tmp/void-reviewer-bundle-html-runtime-check.err; then
    python3 - /tmp/void-reviewer-bundle-html-runtime-check.html "$html_marker" "$bundle_json_route" "$json_status_route" "$html_status_route" "$status" <<'PY'
import sys
from pathlib import Path

path, html_marker, bundle_json_route, json_status_route, html_status_route, expected_status = sys.argv[1:]
html = Path(path).read_text(encoding="utf-8")

assert html_marker in html
assert bundle_json_route in html
assert json_status_route in html
assert html_status_route in html
assert expected_status in html
assert "No terminal execute authorization" in html
assert "No actual execute authorization" in html
assert "No signer access" in html
assert "No execution" in html
assert "No public mutation route" in html
assert "No terminal lane reopen" in html
PY
    echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_runtime_url_green=$url"
    runtime_seen=true
    break
  fi
done

if [ "$runtime_seen" = false ]; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_runtime_url_observed=false"
  echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_runtime_url_note=local_runtime_not_seen_static_reviewer_bundle_html_remains_green"
fi

rm -f /tmp/void-reviewer-bundle-html-runtime-check.html /tmp/void-reviewer-bundle-html-runtime-check.err

if grep -RInE 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_ROLLUP_HOLD_V1|docs/private|fixtures/private|ops/private' "$doc" "$fixture" "$bundle_json_file" "$bundle_html_file" "$json_status_file" "$html_status_file" "$pool_index" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_private_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_private_leak_absent=true"

if grep -RInE '[a-fA-F0-9]{64}' "$doc" "$fixture" "$bundle_json_file" "$bundle_html_file" "$json_status_file" "$html_status_file" "$pool_index" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_raw_hash_or_key_like_hex_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_raw_hash_or_key_like_hex_absent=true"

if grep -RInE '(canonical_payment_identity|allocation_record_hash|private[_ -]?key|seed[_ -]?phrase|wallet[_ -]?secret)[[:space:]]*[:=]' "$doc" "$fixture" "$bundle_json_file" "$bundle_html_file" "$json_status_file" "$html_status_file" "$pool_index" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_secret_assignment_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_secret_assignment_leak_absent=true"

if grep -RInE 'app\.(post|put|patch|delete)|router\.(post|put|patch|delete)|method[[:space:]]*:[[:space:]]*"(POST|PUT|PATCH|DELETE)"|public_mutation_route_created[[:space:]]*:[[:space:]]*true' "$doc" "$fixture" "$bundle_json_file" "$bundle_html_file" "$json_status_file" "$html_status_file" "$pool_index" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_public_mutation_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_public_mutation_absent=true"

echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_no_terminal_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_no_actual_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_no_signer_access=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_no_execution=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_no_signing=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_no_transfer=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_no_broadcast=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_no_fulfilled_state=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_reviewer_closeout_bundle_html_runtime_live_verification_hold_no_terminal_lane_reopen=true"

echo "${marker}_GREEN"
