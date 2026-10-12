#!/usr/bin/env bash
set -euo pipefail

echo "=== VOID Public Node Local Data Drop Import Dir Multi Scratch Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

SRC="/tmp/void-multi-import-proof-src"
DATA="/tmp/void-multi-import-proof-data"
OUT="/tmp/void-multi-import-proof.out"
BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"

rm -rf "$SRC" "$DATA" "$OUT"
mkdir -p "$SRC/subdir"

printf 'VOID multi import alpha v1\n' > "$SRC/alpha.txt"
printf 'VOID multi import beta v1\n' > "$SRC/beta.txt"
printf 'VOID multi import nested gamma v1\n' > "$SRC/subdir/gamma.txt"

DATA_DIR="$DATA" ops/mainnet0/public-node-local-data-drop-import-dir.sh "$SRC" > "$OUT"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1" "$OUT"
grep -Fq "imported_object_id=alpha.txt" "$OUT"
grep -Fq "imported_object_id=beta.txt" "$OUT"
grep -Fq "imported_object_id=subdir__gamma.txt" "$OUT"
grep -Fq "imported_count=3" "$OUT"
grep -Fq "operator_local_import_only=true" "$OUT"
grep -Fq "public_read_only=true" "$OUT"
grep -Fq "trusted_as_network_truth=false" "$OUT"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1_IMPORTED" "$OUT"

curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" > /tmp/void-multi-import-live-weighted.json

python3 - <<'PY'
import json
from pathlib import Path
j = json.loads(Path("/tmp/void-multi-import-live-weighted.json").read_text())
assert j.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", j
assert j.get("object_count") == 1, j
print("validated_multi_scratch_import=true")
print("validated_nested_object_id_sanitized=true")
print("validated_live_weighted_count_unchanged=1")
PY

cat "$OUT"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_MULTI_SCRATCH_V1_GREEN"
