#!/usr/bin/env bash
set -euo pipefail

n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-buyer-facing-final-seal-link-v1
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_BUYER_FACING_FINAL_SEAL_LINK_V1"

doc="docs/public/$n.md"
fixture="fixtures/public/$n.json"

source_n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-node-reviewer-closeout-final-seal-v1
source_proof="ops/mainnet0/$source_n-proof.sh"

pool_index="public/public-node/usdc-void-buy-pool/index.json"
root_index="public/public-node/index.json"

bundle_html_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.html"
bundle_json_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.json"
status_html_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html"
status_json_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_BUYER_FACING_FINAL_SEAL_LINK_V1_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$source_proof"
test -f "$pool_index"
test -f "$root_index"
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_final_seal_link_files_exist=true"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
grep -Fq "$marker" "$pool_index"
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_final_seal_link_marker_green=true"

python3 - <<'PY'
import json
from pathlib import Path

n = "usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-buyer-facing-final-seal-link-v1"
marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_BUYER_FACING_FINAL_SEAL_LINK_V1"

bundle_html_route = "/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.html"
bundle_json_route = "/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.json"
status_html_route = "/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html"
status_json_route = "/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"

fixture = json.loads(Path(f"fixtures/public/{n}.json").read_text())
pool = json.loads(Path("public/public-node/usdc-void-buy-pool/index.json").read_text())

assert fixture["marker"] == marker
assert fixture["status"] == "buyer_facing_reviewer_closeout_link_ready"
assert fixture["boundary"]["public_safe"] is True
assert fixture["boundary"]["read_only"] is True
assert fixture["boundary"]["buyer_safe"] is True
assert fixture["boundary"]["closed_without_execution"] is True

for key in [
    "public_mutation_route_created",
    "terminal_execute_authorized",
    "actual_execute_authorized",
    "signer_access_granted",
    "execution_performed",
    "signing_performed",
    "void_transfer_performed",
    "transaction_broadcast",
    "fulfilled_state_written",
    "terminal_lane_reopened",
]:
    assert fixture["boundary"][key] is False, key

link = pool.get("buyer_facing_reviewer_closeout_link_v1")
assert isinstance(link, dict)
assert link["id"] == n
assert link["marker"] == marker
assert link["route"] == bundle_html_route
assert link["json_route"] == bundle_json_route
assert link["status_html_route"] == status_html_route
assert link["status_json_route"] == status_json_route
assert link["public_safe"] is True
assert link["read_only"] is True
assert link["buyer_safe"] is True
assert link["closed_without_execution"] is True

for key in [
    "public_mutation_route_created",
    "terminal_execute_authorized",
    "actual_execute_authorized",
    "signer_access_granted",
    "execution_performed",
    "signing_performed",
    "void_transfer_performed",
    "transaction_broadcast",
    "fulfilled_state_written",
    "terminal_lane_reopened",
]:
    assert link[key] is False, key

routes = pool.get("routes", [])
assert any(isinstance(r, dict) and r.get("id") == n and r.get("route") == bundle_html_route for r in routes)

html_target = fixture.get("optional_html_target")
if html_target:
    s = Path(html_target).read_text()
    assert marker in s
    assert bundle_html_route in s
    assert status_html_route in s

print("automatic_payment_canary_separate_terminal_closeout_buyer_facing_final_seal_link_fixture_green=true")
print("automatic_payment_canary_separate_terminal_closeout_buyer_facing_final_seal_link_pool_index_green=true")
print("automatic_payment_canary_separate_terminal_closeout_buyer_facing_final_seal_link_route_bindings_green=true")
PY

if grep -RInE '```|zoso@|VOID_BUY_VOID_LANDING_TARGET_DISCOVERY_READY|final seal proof smoke|candidate buyer/public landing files' "$doc" "$fixture" >/tmp/${n}-terminal-contamination.txt; then
  cat /tmp/${n}-terminal-contamination.txt
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_final_seal_link_terminal_output_contamination_absent=true"

if grep -RInE 'allocation_record_hash|canonical_payment_identity|private_key|seed_phrase|wallet_secret|secret[[:space:]]*=' "$doc" "$fixture" "$pool_index" >/tmp/${n}-secret-leak.txt; then
  cat /tmp/${n}-secret-leak.txt
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_final_seal_link_secret_material_absent=true"

if grep -RInE 'terminal_execute_authorized[":[:space:]]+true|actual_execute_authorized[":[:space:]]+true|signer_access_granted[":[:space:]]+true|execution_performed[":[:space:]]+true|signing_performed[":[:space:]]+true|void_transfer_performed[":[:space:]]+true|transaction_broadcast[":[:space:]]+true|fulfilled_state_written[":[:space:]]+true|terminal_lane_reopened[":[:space:]]+true|public_mutation_route_created[":[:space:]]+true' "$doc" "$fixture" "$pool_index" >/tmp/${n}-authority-true.txt; then
  cat /tmp/${n}-authority-true.txt
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_final_seal_link_authority_boundary_green=true"

echo
echo "== source final seal proof remains green =="
bash "$source_proof"
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_final_seal_link_source_final_seal_green=true"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_BUYER_FACING_FINAL_SEAL_LINK_V1_GREEN"
