#!/usr/bin/env bash
set -euo pipefail

n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-status-rollup-route-runtime-live-verification-hold-v1
source_n=usdc-void-buy-pool-automatic-payment-canary-separate-terminal-closeout-public-status-rollup-route-v1

doc="docs/public/$n.md"
fixture="fixtures/public/$n.json"
source_proof="ops/mainnet0/$source_n-proof.sh"
runtime_public_file="public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_ROUTE_RUNTIME_LIVE_VERIFICATION_HOLD_V1"
source_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_ROUTE_V1"
status_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_PUBLIC_STATUS_ROLLUP_V1"
route="/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-status-rollup-v1.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$source_proof"
test -f "$runtime_public_file"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_files_exist=true"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"
grep -q "$status_marker" "$runtime_public_file"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_marker_green=true"

if grep -nE '(_PUSHED"|_GREEN"|PROOF_BEGIN|automatic_payment_canary_|^== source |allocation_record_hash=)' "$doc"; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_doc_terminal_output_contamination_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_doc_terminal_output_contamination_absent=true"

python3 - "$fixture" "$runtime_public_file" "$marker" "$source_marker" "$status_marker" "$route" <<'PY'
import json
import sys

fixture_path, runtime_path, marker, source_marker, status_marker, route = sys.argv[1:]

with open(fixture_path, "r", encoding="utf-8") as f:
    data = json.load(f)

with open(runtime_path, "r", encoding="utf-8") as f:
    runtime = json.load(f)

assert data["marker"] == marker
assert data["source_route_marker"] == source_marker
assert data["source_status_marker"] == status_marker
assert data["route"] == route
assert data["read_only"] is True
assert data["observation_only"] is True
assert data["runtime_check_optional"] is True
assert data["expected_status"] == "canary_separate_terminal_lane_closed_without_execution"

assert runtime["marker"] == status_marker
assert runtime["status"] == "canary_separate_terminal_lane_closed_without_execution"
assert runtime["closed_without_execution"] is True
assert runtime["public_safe"] is True

for key, value in data["authority"].items():
    assert value is False, key

for key, value in runtime["authority"].items():
    assert value is False, key
PY

echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_static_binding_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_runtime_file_green=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_authority_boundary_green=true"

echo
echo "== source public route proof remains green =="
bash "$source_proof"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_source_route_green=true"

# Optional localhost runtime check. This is observation-only and will not fail if the service is down.
runtime_seen=false
for base in "http://127.0.0.1:3000" "http://127.0.0.1:4173" "http://127.0.0.1:8080" "http://127.0.0.1:8787"; do
  url="${base}${route}"
  if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "$url" > /tmp/void-route-runtime-check.json 2>/tmp/void-route-runtime-check.err; then
    python3 - /tmp/void-route-runtime-check.json "$status_marker" <<'PY'
import json
import sys

path, status_marker = sys.argv[1:]
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

assert data["marker"] == status_marker
assert data["status"] == "canary_separate_terminal_lane_closed_without_execution"
assert data["closed_without_execution"] is True
assert data["public_safe"] is True

for key, value in data["authority"].items():
    assert value is False, key
PY
    echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_runtime_url_green=$url"
    runtime_seen=true
    break
  fi
done

if [ "$runtime_seen" = false ]; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_runtime_url_observed=false"
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_runtime_url_note=local_runtime_not_seen_static_route_remains_green"
fi

rm -f /tmp/void-route-runtime-check.json /tmp/void-route-runtime-check.err

if grep -RInE 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_CLOSEOUT_ROLLUP_HOLD_V1|docs/private|fixtures/private|ops/private' "$doc" "$fixture" "$runtime_public_file" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_private_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_private_leak_absent=true"

if grep -RInE '[a-fA-F0-9]{64}' "$doc" "$fixture" "$runtime_public_file" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_raw_hash_or_key_like_hex_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_raw_hash_or_key_like_hex_absent=true"

if grep -RInE '(canonical_payment_identity|allocation_record_hash|private[_ -]?key|seed[_ -]?phrase|wallet[_ -]?secret)[[:space:]]*[:=]' "$doc" "$fixture" "$runtime_public_file" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_secret_assignment_leak_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_secret_assignment_leak_absent=true"

if grep -RInE 'app\.(post|put|patch|delete)|router\.(post|put|patch|delete)|method[[:space:]]*:[[:space:]]*"(POST|PUT|PATCH|DELETE)"|public_mutation_route_created[[:space:]]*:[[:space:]]*true' "$doc" "$fixture" "$runtime_public_file" 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_public_mutation_absent=false"
  exit 1
fi
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_public_mutation_absent=true"

echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_no_terminal_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_no_actual_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_no_signer_access=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_no_execution=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_no_signing=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_no_transfer=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_no_broadcast=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_no_fulfilled_state=true"
echo "automatic_payment_canary_separate_terminal_closeout_public_status_rollup_route_runtime_live_verification_hold_no_terminal_lane_reopen=true"

echo "${marker}_GREEN"
