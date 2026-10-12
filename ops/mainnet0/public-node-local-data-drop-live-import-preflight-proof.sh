#!/usr/bin/env bash
set -euo pipefail

SCRIPT="ops/mainnet0/public-node-local-data-drop-live-import-preflight.sh"
BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
SRC="/tmp/void-live-import-preflight-proof-src"

echo "=== VOID Public Node Local Data Drop Live Import Preflight Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -x "$SCRIPT"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_V1" "$SCRIPT"
grep -Fq "VOID_LIVE_IMPORT_PREFLIGHT_ALLOW_DIRTY" "$SCRIPT"
grep -Fq "mutation_performed=false" "$SCRIPT"
grep -Fq "recommended_live_import_command_begin" "$SCRIPT"
grep -Fq "ops/mainnet0/public-node-local-data-drop-import-dir.sh" "$SCRIPT"

rm -rf "$SRC"
mkdir -p "$SRC/subdir"
printf '%s\n' "VOID live import preflight alpha" > "$SRC/alpha.txt"
printf '%s\n' "VOID live import preflight nested beta" > "$SRC/subdir/beta.txt"

curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" > /tmp/void-live-import-preflight-proof-before.json

VOID_LIVE_IMPORT_PREFLIGHT_ALLOW_DIRTY=true "$SCRIPT" "$SRC" > /tmp/void-live-import-preflight-proof-output.log

grep -Fq "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_V1" /tmp/void-live-import-preflight-proof-output.log
grep -Fq "dirty_allowed_for_proof=true" /tmp/void-live-import-preflight-proof-output.log
grep -Fq "validated_live_weighted_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" /tmp/void-live-import-preflight-proof-output.log
grep -Fq "current_object_count=1" /tmp/void-live-import-preflight-proof-output.log
grep -Fq "source_file_count=2" /tmp/void-live-import-preflight-proof-output.log
grep -Fq "expected_object_count_after_import=3" /tmp/void-live-import-preflight-proof-output.log
grep -Fq "alpha.txt" /tmp/void-live-import-preflight-proof-output.log
grep -Fq "subdir/beta.txt" /tmp/void-live-import-preflight-proof-output.log
grep -Fq "recommended_live_import_command_begin" /tmp/void-live-import-preflight-proof-output.log
grep -Fq "recommended_live_import_command_end" /tmp/void-live-import-preflight-proof-output.log
grep -Fq "mutation_performed=false" /tmp/void-live-import-preflight-proof-output.log
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_V1_READY" /tmp/void-live-import-preflight-proof-output.log

curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" > /tmp/void-live-import-preflight-proof-after.json

python3 - <<'PY'
import json
from pathlib import Path
before = json.loads(Path("/tmp/void-live-import-preflight-proof-before.json").read_text())
after = json.loads(Path("/tmp/void-live-import-preflight-proof-after.json").read_text())
assert before.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", before
assert after.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", after
assert before.get("object_count") == 1, before
assert after.get("object_count") == 1, after
assert before == after, (before, after)
print("validated_no_live_mutation=true")
PY

tail -n 20 /tmp/void-live-import-preflight-proof-output.log

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_V1_GREEN"
