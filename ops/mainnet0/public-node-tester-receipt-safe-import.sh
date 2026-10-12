#!/usr/bin/env bash
set -euo pipefail

RECEIPT="${1:-}"
EXPECTED_BASE="${EXPECTED_BASE:-}"
DATA_DIR="${DATA_DIR:-data_a}"
LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
CONFIRM_IMPORT="${CONFIRM_IMPORT:-false}"
VERIFY_PUBLIC_ROUTE="${VERIFY_PUBLIC_ROUTE:-false}"
OUT="${OUT:-/tmp/public-node-tester-receipt-safe-import-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_TESTER_RECEIPT_SAFE_IMPORT_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "receipt=${RECEIPT:-unset}"
echo "expected_base=${EXPECTED_BASE:-unset}"
echo "data_dir=$DATA_DIR"
echo "local_base=$LOCAL_BASE"
echo "confirm_import=$CONFIRM_IMPORT"
echo "verify_public_route=$VERIFY_PUBLIC_ROUTE"
echo "out=$OUT"

if [ -z "$RECEIPT" ]; then
  echo "ERROR: usage: $0 /path/to/tester-receipt.json"
  exit 2
fi

if [ ! -f "$RECEIPT" ]; then
  echo "ERROR: receipt file not found: $RECEIPT"
  exit 3
fi

test -x ops/mainnet0/public-node-tester-receipt-preflight.sh
test -x ops/mainnet0/public-node-import-tester-result.sh

EXPECTED_BASE="$EXPECTED_BASE" ops/mainnet0/public-node-tester-receipt-preflight.sh "$RECEIPT" | tee "$OUT/preflight.log"
grep -Fq "VOID_PUBLIC_NODE_TESTER_RECEIPT_PREFLIGHT_V1_GREEN" "$OUT/preflight.log"

echo "preflight_passed=true"

if [ "$CONFIRM_IMPORT" != "true" ]; then
  echo "import_skipped=true"
  echo "set_CONFIRM_IMPORT_true_to_import=true"
  echo "VOID_PUBLIC_NODE_TESTER_RECEIPT_SAFE_IMPORT_V1_PREFLIGHT_GREEN"
  exit 0
fi

DATA_DIR="$DATA_DIR" ops/mainnet0/public-node-import-tester-result.sh "$RECEIPT" | tee "$OUT/import.log"
grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_IMPORT_HELPER_V1_IMPORTED" "$OUT/import.log"

LATEST_PATH="$DATA_DIR/public-node/tester-result-intake/latest.json"

if [ ! -f "$LATEST_PATH" ]; then
  echo "ERROR: latest intake file missing: $LATEST_PATH"
  exit 4
fi

cp "$LATEST_PATH" "$OUT/latest.json"

python3 - "$OUT/latest.json" "$EXPECTED_BASE" <<'PY'
import json, sys
from pathlib import Path

latest = json.loads(Path(sys.argv[1]).read_text())
expected_base = sys.argv[2].strip().rstrip("/")

assert latest.get("marker") == "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1"
assert latest.get("intake_marker") == "VOID_PUBLIC_NODE_TESTER_RESULT_IMPORT_HELPER_V1"
assert latest.get("observed_green_marker") == "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
assert latest.get("result") == "green"
assert latest.get("imported_by_operator") is True
assert latest.get("trusted_as_network_truth") is False

base = str(latest.get("tested_base_url") or "").rstrip("/")
assert base.startswith("http://") or base.startswith("https://")
if expected_base:
    assert base == expected_base, f"tested_base_url mismatch: expected {expected_base}, got {base}"

orig = latest.get("original_receipt")
assert isinstance(orig, dict), "original_receipt missing"
assert orig.get("trusted_as_network_truth") is False

print("latest_intake_file_checks=green")
print(f"tested_base_url={base}")
print(f"tester_label={latest.get('tester_label')}")
print(f"trusted_as_network_truth={latest.get('trusted_as_network_truth')}")
PY

echo "import_passed=true"

if [ "$VERIFY_PUBLIC_ROUTE" = "true" ]; then
  curl -fsS "$LOCAL_BASE/public-node/tester-result-intake.json" > "$OUT/public-intake.json"

  python3 - "$OUT/public-intake.json" <<'PY'
import json, sys
from pathlib import Path

doc = json.loads(Path(sys.argv[1]).read_text())
assert doc.get("marker") == "VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_V1"
assert doc.get("status") == "external_tester_result_imported"
intake = doc.get("intake", {})
assert intake.get("latest_imported") is True
latest = intake.get("latest_result")
assert isinstance(latest, dict)
assert latest.get("intake_marker") == "VOID_PUBLIC_NODE_TESTER_RESULT_IMPORT_HELPER_V1"
assert latest.get("trusted_as_network_truth") is False
print("public_intake_route_checks=green")
PY

  echo "public_route_verified=true"
else
  echo "public_route_verified=false"
fi

echo "VOID_PUBLIC_NODE_TESTER_RECEIPT_SAFE_IMPORT_V1_GREEN"
