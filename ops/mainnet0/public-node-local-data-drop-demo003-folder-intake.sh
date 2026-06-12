#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-local-data-drop-demo003-folder-intake-$STAMP}"
FIXTURE_OUT="$OUT/fixture"
VERIFY_OUT="$OUT/verify"
INTAKE_DIR="$DATA_DIR/public-node/local-data-drop-demo003-folder-fixtures"
LATEST="$INTAKE_DIR/latest"
ARCHIVE="$INTAKE_DIR/archive/demo003-folder-fixture-$STAMP"

FIXTURE_SCRIPT="ops/mainnet0/public-node-local-data-drop-demo003-folder-fixture.sh"
VERIFY_SCRIPT="ops/mainnet0/public-node-local-data-drop-demo003-verify-folder-fixture.sh"

mkdir -p "$OUT" "$INTAKE_DIR/archive"

echo "=== VOID Public Node Demo 003 Folder Intake v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_V1"
echo "data_dir=$DATA_DIR"
echo "out=$OUT"
echo "latest=$LATEST"
echo "archive=$ARCHIVE"

test -x "$FIXTURE_SCRIPT"
test -x "$VERIFY_SCRIPT"

OUT="$FIXTURE_OUT" "$FIXTURE_SCRIPT" | tee "$OUT/fixture.log"

TARBALL="$FIXTURE_OUT/demo003-folder-fixture.tar.gz"
test -f "$TARBALL"

"$VERIFY_SCRIPT" "$TARBALL" "$VERIFY_OUT" | tee "$OUT/verify.log"

test -d "$VERIFY_OUT/extract/demo003-folder-fixture"
test -f "$VERIFY_OUT/extract/demo003-folder-fixture/manifest.json"
test -f "$VERIFY_OUT/extract/demo003-folder-fixture/sha256sums.txt"

rm -rf "$ARCHIVE"
mkdir -p "$ARCHIVE"
cp -a "$VERIFY_OUT/extract/demo003-folder-fixture/." "$ARCHIVE/"
cp "$OUT/fixture.log" "$ARCHIVE/fixture.log"
cp "$OUT/verify.log" "$ARCHIVE/verify.log"

python3 - "$ARCHIVE/manifest.json" "$ARCHIVE/intake.json" <<'PY'
import json, sys, datetime

manifest_path, intake_path = sys.argv[1], sys.argv[2]
manifest = json.load(open(manifest_path))

intake = {
    "marker": "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_RECORD_V1",
    "object_set_id": manifest.get("object_set_id"),
    "file_count": manifest.get("file_count"),
    "offline_verified": True,
    "network_fetch_during_import": False,
    "trusted_as_network_truth": False,
    "public_routes_only": True,
    "read_only": True,
    "mutation": False,
    "money_movement": False,
    "wallet_send": False,
    "validator_mutation": False,
    "imported_at_utc": datetime.datetime.utcnow().strftime("%Y%m%d-%H%M%S"),
    "source_manifest": manifest,
}

with open(intake_path, "w") as f:
    json.dump(intake, f, indent=2, sort_keys=True)
    f.write("\n")
PY

rm -rf "$LATEST"
ln -s "$(realpath "$ARCHIVE")" "$LATEST"

python3 - "$LATEST/intake.json" <<'PY'
import json, sys

d = json.load(open(sys.argv[1]))
assert d["marker"] == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_RECORD_V1"
assert d["offline_verified"] is True
assert d["network_fetch_during_import"] is False
assert d["trusted_as_network_truth"] is False
assert d["file_count"] == 3

print("object_set_id=" + str(d["object_set_id"]))
print("file_count=" + str(d["file_count"]))
print("offline_verified=true")
print("network_fetch_during_import=false")
print("trusted_as_network_truth=false")
PY

echo "archive=$ARCHIVE"
echo "latest=$LATEST"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_V1_IMPORTED"
