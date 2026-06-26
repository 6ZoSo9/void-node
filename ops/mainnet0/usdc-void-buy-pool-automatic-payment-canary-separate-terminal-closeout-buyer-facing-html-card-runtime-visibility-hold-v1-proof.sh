#!/usr/bin/env bash
set -euo pipefail

n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-buyer-facing-html-card-runtime-visibility-hold-v1
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_BUYER_FACING_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"

doc="docs/public/$n.md"
fixture="fixtures/public/$n.json"

source_n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-buyer-facing-final-seal-link-v1
source_proof="ops/mainnet0/$source_n-proof.sh"

pool_index="public/public-node/usdc-void-buy-pool/index.json"
root_index="public/public-node/index.json"
html_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-buyer-facing-final-seal-link-v1.html"

html_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-buyer-facing-final-seal-link-v1.html"
bundle_html_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.html"
bundle_json_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.json"
status_html_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html"
status_json_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"
pool_index_route="/public-node/usdc-void-buy-pool/index.json"
root_index_route="/public-node/index.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$source_proof"
test -f "$pool_index"
test -f "$root_index"
test -f "$html_file"
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_files_exist=true"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
grep -Fq "$marker" "$html_file"
grep -Fq "$marker" "$pool_index"
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_marker_green=true"

grep -Fq "$html_route" "$fixture"
grep -Fq "$html_route" "$pool_index"
grep -Fq "$bundle_html_route" "$html_file"
grep -Fq "$bundle_json_route" "$html_file"
grep -Fq "$status_html_route" "$html_file"
grep -Fq "$status_json_route" "$html_file"
grep -Fq "$pool_index_route" "$html_file"
grep -Fq "$root_index_route" "$html_file"
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_static_html_bindings_green=true"

python3 - <<'PY'
import json
from pathlib import Path

n = "usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-buyer-facing-html-card-runtime-visibility-hold-v1"
marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_BUYER_FACING_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"

html_route = "/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-buyer-facing-final-seal-link-v1.html"
bundle_html_route = "/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.html"
status_html_route = "/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html"

fixture = json.loads(Path(f"fixtures/public/{n}.json").read_text())
pool = json.loads(Path("public/public-node/usdc-void-buy-pool/index.json").read_text())

assert fixture["marker"] == marker
assert fixture["status"] == "buyer_facing_html_card_runtime_visibility_hold_ready"
assert fixture["html_route"] == html_route
assert fixture["runtime_observation_required"] is False
assert fixture["static_html_remains_canonical"] is True

boundary = fixture["boundary"]
for key in ["public_safe", "read_only", "buyer_safe", "closed_without_execution"]:
    assert boundary[key] is True, key

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
    assert boundary[key] is False, key

card = pool.get("buyer_facing_html_card_runtime_visibility_hold_v1")
assert isinstance(card, dict)
assert card["id"] == n
assert card["marker"] == marker
assert card["route"] == html_route
assert card["reviewer_bundle_html_route"] == bundle_html_route
assert card["status_html_route"] == status_html_route
assert card["public_safe"] is True
assert card["read_only"] is True
assert card["buyer_safe"] is True
assert card["closed_without_execution"] is True

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
    assert card[key] is False, key

routes = pool.get("routes", [])
assert any(isinstance(r, dict) and r.get("id") == n and r.get("route") == html_route for r in routes)
PY
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_fixture_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_pool_index_green=true"

if grep -RInE '```|zoso@|Enumerating objects|Counting objects|Delta compression|Writing objects|remote:|git push|npm run build|Tailscale SSH|Authentication checked' "$doc" "$fixture" "$html_file" >/tmp/${n}-terminal-contamination.txt; then
  cat /tmp/${n}-terminal-contamination.txt
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_terminal_output_contamination_absent=true"

if grep -RInE 'allocation_record_hash|canonical_payment_identity|private_key|seed_phrase|wallet_secret|secret[[:space:]]*=' "$doc" "$fixture" "$html_file" "$pool_index" >/tmp/${n}-secret-leak.txt; then
  cat /tmp/${n}-secret-leak.txt
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_secret_material_absent=true"

if grep -RInE 'terminal_execute_authorized[":[:space:]]+true|actual_execute_authorized[":[:space:]]+true|signer_access_granted[":[:space:]]+true|execution_performed[":[:space:]]+true|signing_performed[":[:space:]]+true|void_transfer_performed[":[:space:]]+true|transaction_broadcast[":[:space:]]+true|fulfilled_state_written[":[:space:]]+true|terminal_lane_reopened[":[:space:]]+true|public_mutation_route_created[":[:space:]]+true' "$doc" "$fixture" "$html_file" "$pool_index" >/tmp/${n}-authority-true.txt; then
  cat /tmp/${n}-authority-true.txt
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_authority_boundary_green=true"

runtime_url_observed=false
for port in 3000 4173 8080 8787; do
  if curl -fsS --max-time 2 "http://127.0.0.1:${port}${html_route}" 2>/tmp/${n}-curl.err | grep -Fq "$marker"; then
    runtime_url_observed=true
    break
  fi
done

echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_runtime_url_observed=${runtime_url_observed}"
if [ "$runtime_url_observed" = false ]; then
  echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_runtime_url_note=local_runtime_not_seen_static_html_remains_green"
fi

echo
echo "== source buyer-facing final seal link proof remains green =="
bash "$source_proof"
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_source_buyer_facing_final_seal_link_green=true"

echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_no_terminal_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_no_actual_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_no_signer_access=true"
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_no_execution=true"
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_no_signing=true"
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_no_transfer=true"
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_no_broadcast=true"
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_no_fulfilled_state=true"
echo "automatic_payment_canary_separate_terminal_closeout_buyer_facing_html_card_runtime_visibility_hold_no_terminal_lane_reopen=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_BUYER_FACING_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN"
