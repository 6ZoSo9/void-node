#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-import-scratch-vs-live.md"
BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"

echo "=== VOID Public Node Local Data Drop Import Scratch vs Live Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-import-dir-scratch-closeout-proof.sh
test -x ops/mainnet0/public-node-local-data-drop-import-dir-multi-scratch-closeout-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_V1" "$DOC"
grep -Fq "Use scratch import for proofs and tests" "$DOC"
grep -Fq "Use live import only when intentionally changing what the Public Node serves" "$DOC"
grep -Fq "single-file scratch import" "$DOC"
grep -Fq "multi-file scratch import" "$DOC"
grep -Fq "subdir__gamma.txt" "$DOC"
grep -Fq "object_count=1" "$DOC" || grep -Fq "object count \`1\`" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" "$DOC"
grep -Fq "Precision-only green" "$DOC"
grep -Fq "Alienware deferred" "$DOC"
grep -Fq "cross-box pending" "$DOC"

curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" > /tmp/void-scratch-vs-live-weighted.json

python3 - <<'PY'
import json
from pathlib import Path
j = json.loads(Path("/tmp/void-scratch-vs-live-weighted.json").read_text())
assert j.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", j
assert j.get("object_count") == 1, j
print("validated_live_weighted_count_still_1=true")
PY

bash ops/mainnet0/public-node-local-data-drop-import-dir-scratch-closeout-proof.sh
bash ops/mainnet0/public-node-local-data-drop-import-dir-multi-scratch-closeout-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_V1_GREEN"
