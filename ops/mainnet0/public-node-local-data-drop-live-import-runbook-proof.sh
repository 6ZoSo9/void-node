#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-live-import-runbook.md"
BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"

echo "=== VOID Public Node Local Data Drop Live Import Runbook Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-import-scratch-vs-live-pointer-closeout-proof.sh
test -x ops/mainnet0/public-node-local-data-drop-import-dir.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_RUNBOOK_V1" "$DOC"
grep -Fq "intentionally import operator-local files into the live Public Node runtime" "$DOC"
grep -Fq "Live import is different from scratch import" "$DOC"
grep -Fq "/public-node/local-data-drop/weighted.json" "$DOC"
grep -Fq "object_count=1" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" "$DOC"
grep -Fq "Do not run live import casually" "$DOC"
grep -Fq "public surface mutation" "$DOC"
grep -Fq 'DATA_DIR="$HOME/dev/void-node/.runtime/mainnet0"' "$DOC"
grep -Fq "ops/mainnet0/public-node-local-data-drop-import-dir.sh /path/to/source-dir" "$DOC"
grep -Fq "restart \`void-node.service\`" "$DOC"
grep -Fq "verify \`/__void/ready.json\`" "$DOC"
grep -Fq "confirm expected \`object_count\`" "$DOC"
grep -Fq "Do not claim cross-box green" "$DOC"

curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" > /tmp/void-live-import-runbook-weighted.json

python3 - <<'PY'
import json
from pathlib import Path
j = json.loads(Path("/tmp/void-live-import-runbook-weighted.json").read_text())
assert j.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", j
assert j.get("object_count") == 1, j
print("validated_live_weighted_baseline_still_1=true")
PY

bash ops/mainnet0/public-node-local-data-drop-import-scratch-vs-live-pointer-closeout-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_RUNBOOK_V1_GREEN"
