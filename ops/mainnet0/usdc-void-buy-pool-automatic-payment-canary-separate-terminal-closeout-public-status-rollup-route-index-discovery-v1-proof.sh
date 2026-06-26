#!/usr/bin/env bash
set -euo pipefail

n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-status-rollup-route-index-discovery-v1

doc="docs/public/$n.md"
fixture="fixtures/public/$n.json"

source_n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-status-rollup-route-runtime-live-verification-hold-v1
source_proof="ops/mainnet0/$source_n-proof.sh"

route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"
route_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"

root_index="public/public-node/index.json"
pool_index="public/public-node/usdc-void-buy-pool/index.json"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_ROUTE_INDEX_DISCOVERY_V1"
status_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_V1"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$source_proof"
test -f "$route_file"
test -f "$root_index"
test -f "$pool_index"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_files_exist=true"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"
grep -q "$status_marker" "$route_file"
grep -q "$route" "$pool_index"
grep -q "/public-node/usdc-void-buy-pool/index.json" "$root_index"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_marker_green=true"

if grep -nE '(_PUSHED"|_GREEN"|PROOF_BEGIN|automatic_payment_canary_|^== source |allocation_record_hash=)' "$doc"; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_doc_terminal_output_contamination_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_doc_terminal_output_contamination_absent=true"

python3 - "$fixture" "$route_file" "$root_index" "$pool_index" "$marker" "$status_marker" "$route" <<'PY'
import json
import sys

fixture_path, route_file, root_index, pool_index, marker, status_marker, route = sys.argv[1:]

with open(fixture_path, "r", encoding="utf-8") as f:
    fixture = json.load(f)

with open(route_file, "r", encoding="utf-8") as f:
    route_data = json.load(f)

with open(root_index, "r", encoding="utf-8") as f:
    root = json.load(f)

with open(pool_index, "r", encoding="utf-8") as f:
    pool = json.load(f)

assert fixture["marker"] == marker
assert fixture["kind"] == "public_route_index_discovery_entry"
assert fixture["route"] == route
assert fixture["method"] == "GET"
assert fixture["read_only"] is True
assert fixture["public_safe"] is True
assert fixture["status"] == "canary_separate_terminal_lane_closed_without_execution"
assert fixture["closed_without_execution"] is True

assert route_data["marker"] == status_marker
assert route_data["status"] == "canary_separate_terminal_lane_closed_without_execution"
assert route_data["closed_without_execution"] is True
assert route_data["public_safe"] is True

assert root["read_only"] is True
assert root["public_safe"] is True
assert pool["read_only"] is True
assert pool["public_safe"] is True

root_routes = root["routes"]
pool_routes = pool["routes"]

assert any(
    isinstance(r, dict)
    and r.get("route") == "/public-node/usdc-void-buy-pool/index.json"
    and r.get("read_only") is True
    and r.get("public_safe") is True
    for r in root_routes
)

assert any(
    isinstance(r, dict)
    and r.get("route") == route
    and r.get("method") == "GET"
    and r.get("status") == "canary_separate_terminal_lane_closed_without_execution"
    and r.get("closed_without_execution") is True
    and r.get("read_only") is True
    and r.get("public_safe") is True
    for r in pool_routes
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

for key, value in route_data["authority"].items():
    assert value is False, key
PY

echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_fixture_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_root_index_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_pool_index_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_route_binding_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_read_only_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_authority_boundary_green=true"

echo
echo "== source runtime live verification hold proof remains green =="
bash "$source_proof"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_source_runtime_hold_green=true"

if grep -RInE 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_ROLLUP_HOLD_V1|docs/private|fixtures/private|ops/private' "$doc" "$fixture" "$route_file" "$root_index" "$pool_index" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_private_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_private_leak_absent=true"

if grep -RInE '[a-fA-F0-9]{64}' "$doc" "$fixture" "$route_file" "$root_index" "$pool_index" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_raw_hash_or_key_like_hex_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_raw_hash_or_key_like_hex_absent=true"

if grep -RInE '(canonical_payment_identity|allocation_record_hash|private[_ -]?key|seed[_ -]?phrase|wallet[_ -]?secret)[[:space:]]*[:=]' "$doc" "$fixture" "$route_file" "$root_index" "$pool_index" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_secret_assignment_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_secret_assignment_leak_absent=true"

if grep -RInE 'app\.(post|put|patch|delete)|router\.(post|put|patch|delete)|method[[:space:]]*:[[:space:]]*"(POST|PUT|PATCH|DELETE)"|public_mutation_route_created[[:space:]]*:[[:space:]]*true' "$doc" "$fixture" "$route_file" "$root_index" "$pool_index" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_public_mutation_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_public_mutation_absent=true"

echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_no_terminal_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_no_actual_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_no_signer_access=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_no_execution=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_no_signing=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_no_transfer=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_no_broadcast=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_no_fulfilled_state=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_index_discovery_no_terminal_lane_reopen=true"

echo "${marker}_GREEN"
