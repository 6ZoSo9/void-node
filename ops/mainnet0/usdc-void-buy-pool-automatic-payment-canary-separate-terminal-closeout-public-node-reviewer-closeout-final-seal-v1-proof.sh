#!/usr/bin/env bash
set -euo pipefail

n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-node-reviewer-closeout-final-seal-v1

doc="docs/public/$n.md"
fixture="fixtures/public/$n.json"

source_n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-node-reviewer-closeout-index-runtime-live-verification-hold-v1
source_proof="ops/mainnet0/$source_n-proof.sh"

root_index="public/public-node/index.json"
pool_index="public/public-node/usdc-void-buy-pool/index.json"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_NODE_REVIEWER_CLOSEOUT_FINAL_SEAL_V1"

bundle_html_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.html"
bundle_json_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.json"
status_json_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"
status_html_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html"
pool_index_route="/public-node/usdc-void-buy-pool/index.json"
root_index_route="/public-node/index.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$source_proof"
test -f "$root_index"
test -f "$pool_index"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_files_exist=true"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_marker_green=true"

if grep -E 'zoso@|~/dev/void-node|Enumerating objects|Counting objects|Delta compression|Writing objects|remote:|git push|npm run build' "$doc" >/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_doc_terminal_output_contamination_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_doc_terminal_output_contamination_absent=true"

python3 - <<PY
import json
from pathlib import Path

fixture = json.loads(Path("$fixture").read_text())

assert fixture["marker"] == "$marker"
assert fixture["status"] == "sealed_public_node_reviewer_closeout_final"
assert fixture["source_runtime_hold"] == "$source_n"
assert fixture["runtime_observation_required"] is False
assert fixture["static_root_index_remains_canonical"] is True
assert fixture["public_safe"] is True
assert fixture["read_only"] is True

expected = {
  "$root_index_route",
  "$pool_index_route",
  "$bundle_html_route",
  "$bundle_json_route",
  "$status_json_route",
  "$status_html_route",
}
assert expected.issubset(set(fixture["sealed_routes"]))

auth = fixture["authority"]
for key, value in auth.items():
    assert value is False, (key, value)
PY
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_fixture_green=true"

grep -Fq "$bundle_html_route" "$root_index"
grep -Fq "$bundle_json_route" "$root_index"
grep -Fq "$status_json_route" "$root_index"
grep -Fq "$status_html_route" "$root_index"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_root_index_green=true"

grep -Fq "$bundle_html_route" "$pool_index"
grep -Fq "$bundle_json_route" "$pool_index"
grep -Fq "$status_json_route" "$pool_index"
grep -Fq "$status_html_route" "$pool_index"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_pool_index_green=true"

grep -Fq "$bundle_html_route" "$fixture"
grep -Fq "$bundle_json_route" "$fixture"
grep -Fq "$status_json_route" "$fixture"
grep -Fq "$status_html_route" "$fixture"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_route_bindings_green=true"

grep -Fq '"read_only": true' "$fixture"
grep -Fq '"public_safe": true' "$fixture"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_read_only_green=true"

if grep -RInE 'docs/private/|fixtures/private/|PRIVATE_|private_key|secret_key|mnemonic|seed phrase' "$doc" "$fixture" >/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_private_or_secret_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_private_or_secret_leak_absent=true"

if grep -RInE '0x[a-fA-F0-9]{40,}|[a-fA-F0-9]{64,}' "$doc" "$fixture" >/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_raw_hash_or_key_like_hex_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_raw_hash_or_key_like_hex_absent=true"

if grep -RInE 'POST|PUT|PATCH|DELETE|app\.post|app\.put|app\.patch|app\.delete|router\.post|router\.put|router\.patch|router\.delete' "$doc" "$fixture" >/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_public_mutation_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_public_mutation_absent=true"

grep -Fq '"terminal_execute_authorized": false' "$fixture"
grep -Fq '"actual_execute_authorized": false' "$fixture"
grep -Fq '"signer_access_authorized": false' "$fixture"
grep -Fq '"execution_authorized": false' "$fixture"
grep -Fq '"signing_authorized": false' "$fixture"
grep -Fq '"transfer_authorized": false' "$fixture"
grep -Fq '"broadcast_authorized": false' "$fixture"
grep -Fq '"fulfilled_state_authorized": false' "$fixture"
grep -Fq '"terminal_lane_reopen_authorized": false' "$fixture"
grep -Fq '"public_mutation_authorized": false' "$fixture"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_authority_boundary_green=true"

echo
echo "== source root index runtime hold proof remains green =="
bash "$source_proof"

echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_source_runtime_hold_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_no_terminal_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_no_actual_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_no_signer_access=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_no_execution=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_no_signing=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_no_transfer=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_no_broadcast=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_no_fulfilled_state=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_node_reviewer_closeout_final_seal_no_terminal_lane_reopen=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_NODE_REVIEWER_CLOSEOUT_FINAL_SEAL_V1_GREEN"
