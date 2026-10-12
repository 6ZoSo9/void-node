#!/usr/bin/env bash
set -euo pipefail

RECEIPT="${1:-}"
EXPECTED_BASE="${EXPECTED_BASE:-}"
OUT="${OUT:-/tmp/public-node-tester-receipt-preflight-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_TESTER_RECEIPT_PREFLIGHT_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "receipt=${RECEIPT:-unset}"
echo "expected_base=${EXPECTED_BASE:-unset}"
echo "out=$OUT"

if [ -z "$RECEIPT" ]; then
  echo "ERROR: usage: $0 /path/to/tester-receipt.json"
  exit 2
fi

if [ ! -f "$RECEIPT" ]; then
  echo "ERROR: receipt file not found: $RECEIPT"
  exit 3
fi

cp "$RECEIPT" "$OUT/tester-receipt.json"

python3 - "$OUT/tester-receipt.json" "$EXPECTED_BASE" <<'PY'
import json, sys
from pathlib import Path

receipt_path = Path(sys.argv[1])
expected_base = sys.argv[2].strip().rstrip("/")

doc = json.loads(receipt_path.read_text())

assert doc.get("marker") == "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1", "bad receipt marker"
assert doc.get("observed_green_marker") == "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN", "missing green marker"
assert doc.get("result") == "green", "receipt result is not green"
assert doc.get("trusted_as_network_truth") is False, "receipt must not be trusted as network truth"
assert doc.get("demo003_folder_checked") is True, "Demo 003 folder was not checked"

base = str(doc.get("tested_base_url") or "").rstrip("/")
assert base.startswith("http://") or base.startswith("https://"), "tested_base_url must be http(s)"

if expected_base:
    assert base == expected_base, f"tested_base_url mismatch: expected {expected_base}, got {base}"

manifest = str(doc.get("demo003_folder_manifest") or "")
assert manifest.startswith(base), "demo003 manifest URL must start with tested_base_url"
assert "demo003-folder-fixture-v1/manifest.json" in manifest, "wrong Demo 003 manifest path"

standalone = str(doc.get("standalone_smoke_marker") or "")
assert standalone == "VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_V1", "bad standalone smoke marker"

print("receipt_preflight_json_checks=green")
print(f"tested_base_url={base}")
print(f"tester_label={doc.get('tester_label')}")
print(f"result={doc.get('result')}")
print(f"trusted_as_network_truth={doc.get('trusted_as_network_truth')}")
PY

echo "receipt_preflight_ok=true"
echo "VOID_PUBLIC_NODE_TESTER_RECEIPT_PREFLIGHT_V1_GREEN"
