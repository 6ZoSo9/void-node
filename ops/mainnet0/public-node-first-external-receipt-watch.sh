#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-receipt-watch-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_WATCH_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

test "$(systemctl --user is-active void-node-live.service)" = "active"
echo "service_active=true"

curl -fsS "$LOCAL_BASE/public-node/tester-result-intake.json" > "$OUT/tester-result-intake.json"
curl -fsS "$LOCAL_BASE/public-node/first-tester-request-copy-pack.json" > "$OUT/first-tester-request-copy-pack.json"
curl -fsS "$LOCAL_BASE/public-node/tester-share" > "$OUT/tester-share.html"

grep -Fq "VOID_PUBLIC_NODE_TESTER_SHARE_PAGE_V1" "$OUT/tester-share.html"

python3 - "$OUT" <<'PY'
import json, sys
from pathlib import Path

out = Path(sys.argv[1])
intake = json.loads((out / "tester-result-intake.json").read_text())
pack = json.loads((out / "first-tester-request-copy-pack.json").read_text())

assert intake.get("marker") == "VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_V1"
assert pack.get("marker") == "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_V1"

intake_obj = intake.get("intake", {})
latest_imported = bool(intake_obj.get("latest_imported"))
latest_result = intake_obj.get("latest_result")

assert intake_obj.get("mode") == "operator_local_file_import_only"
assert intake_obj.get("public_post_endpoint") is False

print(f"intake_status={intake.get('status')}")
print(f"latest_imported={latest_imported}")
print(f"expected_green_marker={pack.get('expected_green_marker')}")
print(f"expected_receipt_file={pack.get('expected_receipt_file')}")
print(f"tester_share_page={pack.get('tester_links', {}).get('tester_share_page')}")

if latest_imported:
    print("receipt_state=external_receipt_imported")
    if isinstance(latest_result, dict):
        print(f"latest_result_marker={latest_result.get('marker')}")
        print(f"latest_result_status={latest_result.get('result')}")
        print(f"latest_result_tester={latest_result.get('tester_label')}")
else:
    print("receipt_state=waiting_for_external_receipt")
PY

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_WATCH_V1_GREEN"
