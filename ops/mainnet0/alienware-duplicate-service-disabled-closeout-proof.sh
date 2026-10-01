#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ "${LIVE_SERVICE_CHECK:-0}" != "0" ]; then
  echo "VOID_RETIRED_ALIENWARE_LIVE_SERVICE_CHECK_HOLD_V1 proof=alienware-duplicate-service-disabled-closeout" >&2
  echo "alienware_retired=true" >&2
  echo "live_service_check_performed=false" >&2
  exit 2
fi

DOC="ops/mainnet0/alienware-duplicate-service-disabled-closeout.md"
GUARD_DOC="ops/mainnet0/alienware-runtime-service-truth-guard.md"
GUARD_PROOF="ops/mainnet0/alienware-runtime-service-truth-guard-proof.sh"

expect_grep() {
  local name="$1"
  local pattern="$2"
  local file="$3"

  if ! grep -q "$pattern" "$file"; then
    echo "[fatal] missing $name in $file"
    echo "pattern=$pattern"
    exit 1
  fi

  echo "[ok] $name"
}

echo "=== Alienware duplicate service disabled closeout proof ==="

test -f "$DOC"
test -f "$GUARD_DOC"
test -x "$GUARD_PROOF"

echo
echo "=== [1] closeout markers ==="
expect_grep "artifact marker" "VOID_ALIENWARE_DUPLICATE_SERVICE_DISABLED_CLOSEOUT_V1" "$DOC"
expect_grep "green result" "result: green" "$DOC"

echo
echo "=== [2] service truth recorded ==="
expect_grep "live service" "void-node-live.service" "$DOC"
expect_grep "duplicate legacy service" "void-node.service" "$DOC"
expect_grep "live enabled" "void-node-live.service enabled: enabled" "$DOC"
expect_grep "live active" "void-node-live.service active: active" "$DOC"
expect_grep "legacy disabled" "void-node.service enabled: disabled" "$DOC"
expect_grep "legacy inactive" "void-node.service active: inactive" "$DOC"

echo
echo "=== [3] live sanity recorded ==="
expect_grep "ready true" "ready: true" "$DOC"
expect_grep "head recorded" "head: 1856587" "$DOC"
expect_grep "gap zero" "gap: 0" "$DOC"
expect_grep "txroot live" "txroot_live: 1" "$DOC"
expect_grep "commit recorded" "134274a7bd9d" "$DOC"
expect_grep "participant marker" "VOID_DATANET_STORE_SERVE_DEMO_V1" "$DOC"

echo
echo "=== [4] guard linkage ==="
expect_grep "runtime service guard artifact" "VOID_ALIENWARE_RUNTIME_SERVICE_TRUTH_GUARD_V1" "$GUARD_DOC"
expect_grep "guard green marker" "VOID_ALIENWARE_RUNTIME_SERVICE_TRUTH_GUARD_GREEN" "$DOC"
expect_grep "guard retired live-service wall" "VOID_RETIRED_ALIENWARE_LIVE_SERVICE_CHECK_HOLD_V1" "$GUARD_PROOF"
expect_grep "retired historical status" "Status: retired historical evidence" "$DOC"
expect_grep "no current authority" "Current authority: none" "$DOC"

echo
echo "=== [5] retired live-service boundary ==="
expect_grep "live service recheck prohibited" "Live service recheck: prohibited" "$DOC"
echo "[ok] LIVE_SERVICE_CHECK permanently disabled for retired Alienware evidence"

echo
echo "=== [6] safety markers ==="
expect_grep "no money movement" "money_movement: false" "$DOC"
expect_grep "no validator mutation" "validator_mutation: false" "$DOC"
expect_grep "no buy void fulfillment" "buy_void_fulfillment: false" "$DOC"

echo
echo "VOID_ALIENWARE_DUPLICATE_SERVICE_DISABLED_CLOSEOUT_GREEN"
echo "historical_evidence_only=true"
echo "current_runtime_authority=false"
echo "live_service_check_performed=false"
