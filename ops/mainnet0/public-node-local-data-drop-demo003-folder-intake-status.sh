#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"
BASE="$DATA_DIR/public-node/local-data-drop-demo003-folder-fixtures"
LATEST="$BASE/latest"
ARCHIVE_DIR="$BASE/archive"

echo "=== VOID Public Node Demo 003 Folder Intake Status v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1"
echo "data_dir=$DATA_DIR"
echo "latest=$LATEST"
echo "archive_dir=$ARCHIVE_DIR"

if [ ! -e "$LATEST/intake.json" ]; then
  echo "status=demo003_folder_intake_missing"
  echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=false"
  exit 1
fi

ARCHIVE_COUNT="$(find "$ARCHIVE_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')"

python3 - "$LATEST/intake.json" "$ARCHIVE_COUNT" <<'PY'
import json, sys

p, archive_count = sys.argv[1], sys.argv[2]
d = json.load(open(p))

assert d["marker"] == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_RECORD_V1"
assert d["offline_verified"] is True
assert d["network_fetch_during_import"] is False
assert d["trusted_as_network_truth"] is False
assert d["file_count"] == 3

print("status=demo003_folder_intake_present")
print("latest_present=true")
print("archive_count=" + archive_count)
print("object_set_id=" + str(d["object_set_id"]))
print("file_count=" + str(d["file_count"]))
print("offline_verified=true")
print("network_fetch_during_import=false")
print("trusted_as_network_truth=false")
print("public_routes_only=true")
print("read_only=true")
print("VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=true")
PY
