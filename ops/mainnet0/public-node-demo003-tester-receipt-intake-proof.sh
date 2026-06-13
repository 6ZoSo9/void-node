#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
LIVE_PID="$(systemctl --user show -p MainPID --value void-node-live.service 2>/dev/null || true)"
LIVE_CWD=""
LIVE_ENV_DATA_DIR=""
if [ -n "$LIVE_PID" ] && [ "$LIVE_PID" != "0" ] && [ -e "/proc/$LIVE_PID/cwd" ]; then
  LIVE_CWD="$(readlink -f "/proc/$LIVE_PID/cwd" 2>/dev/null || true)"
fi
if [ -n "$LIVE_PID" ] && [ "$LIVE_PID" != "0" ] && [ -r "/proc/$LIVE_PID/environ" ]; then
  LIVE_ENV_DATA_DIR="$(tr '\0' '\n' < "/proc/$LIVE_PID/environ" 2>/dev/null | sed -n 's/^DATA_DIR=//p' | tail -n 1)"
fi
DATA_DIR="${DATA_DIR:-${LIVE_ENV_DATA_DIR:-.runtime/mainnet0}}"
case "$DATA_DIR" in
  /*) ;;
  *) if [ -n "$LIVE_CWD" ]; then DATA_DIR="$LIVE_CWD/$DATA_DIR"; fi ;;
esac
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-demo003-tester-receipt-intake-proof-$STAMP}"
INTAKE_DIR="$DATA_DIR/public-node/tester-result-intake"
LATEST="$INTAKE_DIR/latest.json"
BACKUP="$OUT/latest.backup.json"
HAD_LATEST=0

echo "=== VOID Public Node Demo 003 Tester Receipt Intake Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_DEMO003_TESTER_RECEIPT_INTAKE_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "data_dir=$DATA_DIR"
echo "out=$OUT"

mkdir -p "$OUT" "$INTAKE_DIR"

if [ -f "$LATEST" ]; then
  cp "$LATEST" "$BACKUP"
  HAD_LATEST=1
fi

cleanup() {
  if [ "$HAD_LATEST" = "1" ] && [ -f "$BACKUP" ]; then
    cp "$BACKUP" "$LATEST"
  else
    rm -f "$LATEST"
  fi
}
trap cleanup EXIT

grep -Fq "VOID_PUBLIC_NODE_DEMO003_TESTER_RECEIPT_INTAKE_V1" src/index.ts
grep -Fq "demo003_receipt_intake" src/index.ts
grep -Fq "demo003_folder_checked" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_DEMO003_TESTER_RECEIPT_INTAKE_DOC_V1" docs/public/public-node-local-data-drop-demo003-folder-fixture.md
grep -Fq "VOID_PUBLIC_NODE_DEMO003_TESTER_RECEIPT_INTAKE_POINTER_V1" docs/public/public-node-local-data-drop.md

curl -fsS --max-time 8 "$BASE/public-node/tester-result-receipt.json" > "$OUT/tester-result-receipt.json"
grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1" "$OUT/tester-result-receipt.json"
grep -Fq "demo003_folder_checked" "$OUT/tester-result-receipt.json"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json" "$OUT/tester-result-receipt.json"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/index.html" "$OUT/tester-result-receipt.json"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/README.txt" "$OUT/tester-result-receipt.json"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/metadata.json" "$OUT/tester-result-receipt.json"

cat > "$LATEST" <<JSON
{
  "marker": "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1",
  "tester_label": "proof-demo003-receipt-intake",
  "tested_base_url": "$BASE",
  "observed_green_marker": "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN",
  "standalone_smoke_marker": "VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_V1",
  "demo003_folder_checked": true,
  "demo003_folder_manifest": "$BASE/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json",
  "result": "green",
  "trusted_as_network_truth": false
}
JSON

curl -fsS --max-time 8 "$BASE/public-node/tester-result-intake.json" > "$OUT/tester-result-intake.json"

grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_V1" "$OUT/tester-result-intake.json"
grep -Fq "VOID_PUBLIC_NODE_DEMO003_TESTER_RECEIPT_INTAKE_V1" "$OUT/tester-result-intake.json"
grep -Fq '"latest_imported":true' "$OUT/tester-result-intake.json"
grep -Fq '"latest_receipt_present":true' "$OUT/tester-result-intake.json"
grep -Fq '"demo003_folder_checked":true' "$OUT/tester-result-intake.json"
grep -Fq '"receipt_includes_expected_green_marker":true' "$OUT/tester-result-intake.json"
grep -Fq '"trusted_as_network_truth":false' "$OUT/tester-result-intake.json"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json" "$OUT/tester-result-intake.json"
grep -Fq '"public_post_endpoint":false' "$OUT/tester-result-intake.json"
grep -Fq '"operator_local_import_only":true' "$OUT/tester-result-intake.json"

echo "receipt_schema_has_demo003=true"
echo "intake_summary_has_demo003=true"
echo "imported_receipt_demo003_checked=true"
echo "receipt_includes_expected_green_marker=true"
echo "public_post_endpoint=false"
echo "operator_local_import_only=true"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_DEMO003_TESTER_RECEIPT_INTAKE_PROOF_V1_GREEN"
