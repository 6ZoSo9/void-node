#!/usr/bin/env bash
set -euo pipefail

n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-status-rollup-route-v1
source_n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1

doc="docs/public/$n.md"
route_fixture="fixtures/public/$n.json"
source_fixture="fixtures/public/$source_n.json"
source_proof="ops/mainnet0/$source_n-proof.sh"
runtime_public_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_ROUTE_V1"
source_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_V1"
route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$route_fixture"
test -f "$source_fixture"
test -f "$source_proof"
test -f "$runtime_public_file"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_files_exist=true"

grep -q "$marker" "$doc"
grep -q "$marker" "$route_fixture"
grep -q "$source_marker" "$runtime_public_file"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_marker_green=true"

python3 - "$route_fixture" "$source_fixture" "$runtime_public_file" "$marker" "$source_marker" "$route" <<'PY'
import json
import sys

route_fixture_path, source_fixture_path, runtime_path, marker, source_marker, route = sys.argv[1:]

with open(route_fixture_path, "r", encoding="utf-8") as f:
    route_data = json.load(f)

with open(source_fixture_path, "r", encoding="utf-8") as f:
    source_data = json.load(f)

with open(runtime_path, "r", encoding="utf-8") as f:
    runtime_data = json.load(f)

assert route_data["marker"] == marker
assert route_data["kind"] == "public_status_rollup_route"
assert route_data["route"] == route
assert route_data["method"] == "GET"
assert route_data["read_only"] is True
assert route_data["source_public_status_marker"] == source_marker
assert route_data["source_status"] == "canary_separate_terminal_lane_closed_without_execution"
assert route_data["closed_without_execution"] is True
assert route_data["public_safe"] is True

assert source_data == runtime_data
assert runtime_data["marker"] == source_marker
assert runtime_data["status"] == "canary_separate_terminal_lane_closed_without_execution"
assert runtime_data["closed_without_execution"] is True
assert runtime_data["public_safe"] is True

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
    assert route_data[key] is False, key
    assert runtime_data[key] is False, key

for key, value in route_data["authority"].items():
    assert value is False, key

for key, value in runtime_data["authority"].items():
    assert value is False, key
PY

echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_binding_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_status_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_file_matches_source_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_read_only_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_authority_boundary_green=true"

echo
echo "== source public status rollup proof remains green =="
bash "$source_proof"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_source_proof_green=true"

# Route/public file must not leak private markers or private paths.
if grep -RInE 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_ROLLUP_HOLD_V1|docs/private|fixtures/private|ops/private' "$doc" "$route_fixture" "$runtime_public_file" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_private_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_private_leak_absent=true"

# Route/public file must not leak raw private hashes or key-like values.
if grep -RInE '[a-fA-F0-9]{64}' "$doc" "$route_fixture" "$runtime_public_file" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_raw_hash_or_key_like_hex_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_raw_hash_or_key_like_hex_absent=true"

# No secret assignments.
if grep -RInE '(canonical_payment_identity|allocation_record_hash|private[_ -]?key|seed[_ -]?phrase|wallet[_ -]?secret)[[:space:]]*[:=]' "$doc" "$route_fixture" "$runtime_public_file" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_secret_assignment_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_secret_assignment_leak_absent=true"

# No mutation handlers in this patch surface.
if grep -RInE 'app\.(post|put|patch|delete)|router\.(post|put|patch|delete)|method[[:space:]]*:[[:space:]]*"(POST|PUT|PATCH|DELETE)"|public_mutation_route_created[[:space:]]*:[[:space:]]*true' "$doc" "$route_fixture" "$runtime_public_file" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_public_mutation_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_public_mutation_absent=true"

echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_no_terminal_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_no_actual_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_no_signer_access=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_no_execution=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_no_signing=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_no_transfer=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_no_broadcast=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_no_fulfilled_state=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_no_terminal_lane_reopen=true"

echo "${marker}_GREEN"
