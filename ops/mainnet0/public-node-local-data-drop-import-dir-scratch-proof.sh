#!/usr/bin/env bash
set -euo pipefail

echo "=== VOID Public Node Local Data Drop Import Dir Scratch Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

SRC="/tmp/void-import-dir-scratch-src"
DATA="/tmp/void-import-dir-scratch-data"
OUT="/tmp/void-import-dir-scratch-proof.out"
BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"

rm -rf "$SRC" "$DATA" "$OUT"
mkdir -p "$SRC"

printf '%s\n' \
  "VOID local import scratch object v1." \
  "This proves operator-local import without mutating live Precision runtime." \
  > "$SRC/void-import-scratch-v1.txt"

DATA_DIR="$DATA" ops/mainnet0/public-node-local-data-drop-import-dir.sh "$SRC" > "$OUT"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1" "$OUT"
grep -Fq "operator_local_import_only=true" "$OUT"
grep -Fq "public_read_only=true" "$OUT"
grep -Fq "trusted_as_network_truth=false" "$OUT"
grep -Fq "imported_object_id=void-import-scratch-v1.txt" "$OUT"
grep -Fq "imported_count=1" "$OUT"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1_IMPORTED" "$OUT"

SHA="$(sha256sum "$SRC/void-import-scratch-v1.txt" | awk '{print $1}')"
grep -Fq "imported_sha256=$SHA" "$OUT"

curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" > /tmp/void-import-dir-scratch-live-weighted.json

python3 - <<'PY'
import json
from pathlib import Path

weighted = json.loads(Path("/tmp/void-import-dir-scratch-live-weighted.json").read_text())
assert weighted.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", weighted
assert weighted.get("object_count") == 1, weighted
assert len(weighted.get("weighted_records", [])) == 1, weighted

print("validated_scratch_import=true")
print("validated_live_weighted_count_unchanged=1")
PY

cat "$OUT"

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_SCRATCH_V1_GREEN"
