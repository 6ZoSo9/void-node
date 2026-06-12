#!/usr/bin/env bash
set -euo pipefail

SCRIPT="ops/mainnet0/public-node-local-data-drop-live-import-plan.sh"
SRC="/tmp/void-live-import-plan-proof-src"
OUT="/tmp/void-live-import-plan-proof.json"

echo "=== VOID Public Node Local Data Drop Live Import Plan Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_import=true"
echo "mutation_expected=false"

test -x "$SCRIPT"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PLAN_V1" "$SCRIPT"
grep -Fq "mutation_performed" "$SCRIPT"
grep -Fq "expected_object_count_after_import" "$SCRIPT"
grep -Fq "recommended_live_import_command" "$SCRIPT"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" "$SCRIPT"

rm -rf "$SRC"
mkdir -p "$SRC/subdir"
printf 'alpha plan\n' > "$SRC/alpha.txt"
printf 'beta plan\n' > "$SRC/subdir/beta.txt"

rm -f "$OUT"
VOID_LIVE_IMPORT_PLAN_OUT="$OUT" bash "$SCRIPT" "$SRC"

python3 - "$OUT" <<'PY'
import json, sys
from pathlib import Path

p = Path(sys.argv[1])
j = json.loads(p.read_text())

assert j["marker"] == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PLAN_V1", j
assert j["mutation_performed"] is False, j
assert j["validated_live_weighted_marker"] == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", j
assert j["current_object_count"] == 1, j
assert j["source_file_count"] == 2, j
assert j["expected_object_count_after_import"] == 3, j
assert j["source_files"] == ["alpha.txt", "subdir/beta.txt"], j
assert "public-node-local-data-drop-import-dir.sh" in j["recommended_live_import_command"], j
assert j["proof_mode"]["precision"] == "green", j
assert j["proof_mode"]["alienware"] == "deferred", j
assert j["proof_mode"]["cross_box"] == "pending", j

print("validated_plan_json=true")
print("validated_mutation_performed_false=true")
PY

curl -fsS --max-time 8 http://127.0.0.1:4100/public-node/local-data-drop/weighted.json \
  | python3 -c 'import sys,json; j=json.load(sys.stdin); assert j.get("object_count")==1, j; print("validated_live_object_count_still_1=true")'

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PLAN_V1_GREEN"
