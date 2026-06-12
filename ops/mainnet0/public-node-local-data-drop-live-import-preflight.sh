#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-}"
BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
RUNTIME_DATA_DIR="${DATA_DIR:-$PWD/.runtime/mainnet0}"

echo "=== VOID Public Node Local Data Drop Live Import Preflight v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "runtime_data_dir=$RUNTIME_DATA_DIR"

ALLOW_DIRTY="${VOID_LIVE_IMPORT_PREFLIGHT_ALLOW_DIRTY:-false}"

if [ -n "$(git status --short)" ] && [ "$ALLOW_DIRTY" != "true" ]; then
  echo "repo_clean=false"
  git status --short
  exit 2
fi

if [ -n "$(git status --short)" ] && [ "$ALLOW_DIRTY" = "true" ]; then
  echo "repo_clean=false"
  echo "dirty_allowed_for_proof=true"
fi

if [ -z "$SOURCE_DIR" ]; then
  echo "source_dir_missing=true"
  echo "usage: ops/mainnet0/public-node-local-data-drop-live-import-preflight.sh /path/to/source-dir"
  exit 2
fi

test -d "$SOURCE_DIR"

curl -fsS --max-time 8 "$BASE/__void/ready.json" >/tmp/void-live-import-preflight-ready.json
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" >/tmp/void-live-import-preflight-weighted.json

python3 - "$SOURCE_DIR" <<'PY'
import json
import sys
from pathlib import Path

source = Path(sys.argv[1])
weighted = json.loads(Path("/tmp/void-live-import-preflight-weighted.json").read_text())

files = sorted([p for p in source.rglob("*") if p.is_file()])
current = weighted.get("object_count")
marker = weighted.get("marker")

assert marker == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", weighted
assert isinstance(current, int), weighted
assert files, "source directory has no files"

print(f"validated_live_weighted_marker={marker}")
print(f"current_object_count={current}")
print(f"source_file_count={len(files)}")
print(f"expected_object_count_after_import={current + len(files)}")
print("source_files_begin")
for p in files:
    print(str(p.relative_to(source)))
print("source_files_end")
PY

cat <<EOF2
recommended_live_import_command_begin
DATA_DIR="$RUNTIME_DATA_DIR" \\
  ops/mainnet0/public-node-local-data-drop-import-dir.sh "$SOURCE_DIR"
recommended_live_import_command_end
EOF2

echo "mutation_performed=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_V1_READY"
