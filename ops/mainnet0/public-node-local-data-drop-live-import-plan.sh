#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-}"
BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
OUT="${VOID_LIVE_IMPORT_PLAN_OUT:-}"

if [ -z "$SOURCE_DIR" ]; then
  echo "usage: $0 /path/to/source-dir" >&2
  exit 2
fi

if [ ! -d "$SOURCE_DIR" ]; then
  echo "source_dir_not_found=$SOURCE_DIR" >&2
  exit 3
fi

if [ -z "$OUT" ]; then
  OUT="/tmp/void-live-import-plan-$(date -u +%Y%m%d-%H%M%S).json"
fi

TMP_WEIGHTED="$(mktemp)"
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" > "$TMP_WEIGHTED"

python3 - "$SOURCE_DIR" "$TMP_WEIGHTED" "$OUT" <<'PY'
import json, os, sys
from pathlib import Path

source_dir = Path(sys.argv[1]).resolve()
weighted_path = Path(sys.argv[2])
out = Path(sys.argv[3])

weighted = json.loads(weighted_path.read_text())
if weighted.get("marker") != "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1":
    raise SystemExit(f"bad_weighted_marker={weighted.get('marker')}")

source_files = []
for p in sorted(source_dir.rglob("*")):
    if p.is_file():
        source_files.append(str(p.relative_to(source_dir)))

current = int(weighted.get("object_count", 0))
count = len(source_files)

plan = {
    "marker": "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PLAN_V1",
    "mutation_performed": False,
    "source_dir": str(source_dir),
    "source_file_count": count,
    "source_files": source_files,
    "current_object_count": current,
    "expected_object_count_after_import": current + count,
    "validated_live_weighted_marker": weighted.get("marker"),
    "recommended_live_import_command": f'DATA_DIR="$RUNTIME_DATA_DIR" ops/mainnet0/public-node-local-data-drop-import-dir.sh "{source_dir}"',
    "proof_mode": {
        "precision": "green",
        "alienware": "deferred",
        "cross_box": "pending"
    }
}

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(plan, indent=2, sort_keys=True) + "\n")

print(f"plan_path={out}")
print(f"current_object_count={current}")
print(f"source_file_count={count}")
print(f"expected_object_count_after_import={current + count}")
print("mutation_performed=false")
print("VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PLAN_V1_READY")
PY

rm -f "$TMP_WEIGHTED"
