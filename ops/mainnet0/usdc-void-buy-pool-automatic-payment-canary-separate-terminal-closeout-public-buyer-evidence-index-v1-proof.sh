#!/usr/bin/env bash
set -euo pipefail

n="usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-buyer-evidence-index-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_BUYER_EVIDENCE_INDEX_V1"

doc="docs/public/$n.md"
fixture="fixtures/public/$n.json"
html_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-buyer-evidence-index-v1.html"
json_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-buyer-evidence-index-v1.json"
pool_index="public/public-node/usdc-void-buy-pool/index.json"

source_n="usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-buyer-facing-html-card-runtime-visibility-hold-v1"
source_proof="ops/mainnet0/$source_n-proof.sh"

html_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-buyer-evidence-index-v1.html"
json_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-buyer-evidence-index-v1.json"

buyer_html_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-buyer-facing-final-seal-link-v1.html"
bundle_html_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.html"
bundle_json_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-reviewer-closeout-bundle-v1.json"
status_html_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.html"
status_json_route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$html_file"
test -f "$json_file"
test -f "$pool_index"
test -f "$source_proof"
echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_files_exist=true"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
grep -Fq "$marker" "$html_file"
grep -Fq "$marker" "$json_file"
grep -Fq "$marker" "$pool_index"
echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_marker_green=true"

for r in "$html_route" "$json_route" "$buyer_html_route" "$bundle_html_route" "$bundle_json_route" "$status_html_route" "$status_json_route"; do
  grep -Fq "$r" "$doc"
  grep -Fq "$r" "$fixture"
  grep -Fq "$r" "$html_file"
  grep -Fq "$r" "$json_file"
done
echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_route_bindings_green=true"

python3 - <<'PY'
import json
from pathlib import Path

n = "usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-buyer-evidence-index-v1"
marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_BUYER_EVIDENCE_INDEX_V1"
html_route = "/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-buyer-evidence-index-v1.html"
json_route = "/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-buyer-evidence-index-v1.json"

fixture = json.loads(Path(f"fixtures/public/{n}.json").read_text())
public_json = json.loads(Path("public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-buyer-evidence-index-v1.json").read_text())
pool = json.loads(Path("public/public-node/usdc-void-buy-pool/index.json").read_text())

assert fixture == public_json
assert fixture["marker"] == marker
assert fixture["id"] == n
assert fixture["status"] == "public_buyer_evidence_index_ready"
assert fixture["runtime_observation_required"] is False
assert fixture["static_files_remain_canonical"] is True
assert fixture["routes"]["buyer_evidence_index_html"] == html_route
assert fixture["routes"]["buyer_evidence_index_json"] == json_route

boundary = fixture["boundary"]
for key in ["public_safe", "read_only", "buyer_safe", "discoverability_only", "closed_without_execution"]:
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

card = pool.get("public_buyer_evidence_index_v1")
assert isinstance(card, dict)
assert card["id"] == n
assert card["marker"] == marker
assert card["route"] == html_route
assert card["json_route"] == json_route
assert card["public_safe"] is True
assert card["read_only"] is True
assert card["buyer_safe"] is True
assert card["discoverability_only"] is True
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
assert any(isinstance(r, dict) and r.get("id") == n and r.get("route") == html_route and r.get("json_route") == json_route for r in routes)
PY
echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_fixture_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_pool_index_green=true"

if grep -RInE '```|zoso@|Enumerating objects|Counting objects|Delta compression|Writing objects|remote:|git push|npm run build|Tailscale SSH|Authentication checked' "$doc" "$fixture" "$html_file" "$json_file" >/tmp/${n}-terminal-contamination.txt; then
  cat /tmp/${n}-terminal-contamination.txt
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_terminal_output_contamination_absent=true"

if grep -RInE 'allocation_record_hash|canonical_payment_identity|private_key|seed_phrase|wallet_secret|secret[[:space:]]*=' "$doc" "$fixture" "$html_file" "$json_file" >/tmp/${n}-secret-leak.txt; then
  cat /tmp/${n}-secret-leak.txt
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_secret_material_absent=true"

if grep -RInE 'terminal_execute_authorized[":[:space:]]+true|actual_execute_authorized[":[:space:]]+true|signer_access_granted[":[:space:]]+true|execution_performed[":[:space:]]+true|signing_performed[":[:space:]]+true|void_transfer_performed[":[:space:]]+true|transaction_broadcast[":[:space:]]+true|fulfilled_state_written[":[:space:]]+true|terminal_lane_reopened[":[:space:]]+true|public_mutation_route_created[":[:space:]]+true' "$doc" "$fixture" "$html_file" "$json_file" >/tmp/${n}-authority-true.txt; then
  cat /tmp/${n}-authority-true.txt
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_authority_boundary_green=true"

echo
echo "== source buyer-facing HTML card runtime visibility hold proof remains green =="
bash "$source_proof"
echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_source_buyer_facing_html_card_runtime_visibility_hold_green=true"

echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_no_terminal_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_no_actual_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_no_signer_access=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_no_execution=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_no_signing=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_no_transfer=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_no_broadcast=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_no_fulfilled_state=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_buyer_evidence_index_no_terminal_lane_reopen=true"
echo "${marker}_GREEN"
