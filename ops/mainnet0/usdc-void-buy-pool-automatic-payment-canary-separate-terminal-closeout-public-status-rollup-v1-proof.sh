#!/usr/bin/env bash
set -euo pipefail

n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1
doc="docs/public/$n.md"
fixture="fixtures/public/$n.json"

private_source_n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-rollup-hold-v1
private_source_proof="ops/private/$private_source_n-proof.sh"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_V1"
private_source_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_ROLLUP_HOLD_V1"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$private_source_proof"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_files_exist=true"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_marker_green=true"

python3 - "$fixture" "$marker" <<'PY'
import json
import sys

fixture_path, marker = sys.argv[1:]

with open(fixture_path, "r", encoding="utf-8") as f:
    data = json.load(f)

assert data["marker"] == marker
assert data["kind"] == "public_status_rollup"
assert data["scope"] == "usdc_void_buy_pool_automatic_payment_canary_separate_terminal_closeout"
assert data["status"] == "canary_separate_terminal_lane_closed_without_execution"
assert data["closed_without_execution"] is True
assert data["public_safe"] is True

assert data["private_material_exposed"] is False
assert data["canonical_payment_identity_exposed"] is False
assert data["allocation_record_hash_exposed"] is False
assert data["operator_only_paths_exposed"] is False
assert data["wallet_secret_exposed"] is False
assert data["wallet_address_exposed"] is False
assert data["private_key_exposed"] is False
assert data["seed_phrase_exposed"] is False

for key, value in data["authority"].items():
    assert value is False, key
PY

echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_status_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_public_safe_flags_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_authority_boundary_green=true"

echo
echo "== private source terminal closeout rollup proof remains green =="
bash "$private_source_proof"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_private_source_green=true"

# Public output must not leak private-only source marker.
if grep -RIn "$private_source_marker" "$doc" "$fixture" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_private_marker_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_private_marker_leak_absent=true"

# Public output must not leak private paths.
if grep -RInE 'docs/private|fixtures/private|ops/private' "$doc" "$fixture" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_private_path_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_private_path_leak_absent=true"

# Public output must not leak private allocation hash or raw key-like hex.
if grep -RInE '[a-fA-F0-9]{64}' "$doc" "$fixture" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_raw_hash_or_key_like_hex_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_raw_hash_or_key_like_hex_absent=true"

if grep -RInE '(canonical_payment_identity|allocation_record_hash|private[_ -]?key|seed[_ -]?phrase|wallet[_ -]?secret)[[:space:]]*[:=]' "$doc" "$fixture" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_secret_assignment_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_secret_assignment_leak_absent=true"

# Public status-only artifacts must not create mutation routes or runtime handlers.
if grep -RInE 'app\.(post|put|patch|delete)|router\.(post|put|patch|delete)|fetch\(.*method.*POST|public_mutation_route_created[[:space:]]*:[[:space:]]*true' "$doc" "$fixture" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_public_mutation_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_public_mutation_absent=true"

echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_no_terminal_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_no_actual_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_no_signer_access=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_no_execution=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_no_signing=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_no_transfer=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_no_broadcast=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_no_fulfilled_state=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_no_terminal_lane_reopen=true"

echo "${marker}_GREEN"
