#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-import-stack-status.md"
BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"

echo "=== VOID Public Node Local Data Drop Import Stack Status Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-live-import-runbook-pointer-closeout-proof.sh
test -x ops/mainnet0/public-node-proof-mode-status-card-closeout-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_STATUS_V1" "$DOC"
grep -Fq "Precision-only green" "$DOC"
grep -Fq "Alienware is deferred" "$DOC"
grep -Fq "Cross-box closeout remains pending" "$DOC"
grep -Fq "scratch single-file import works" "$DOC"
grep -Fq "scratch multi-file import works" "$DOC"
grep -Fq "nested paths are sanitized into object IDs" "$DOC"
grep -Fq "scratch import does not mutate the live Public Node object count" "$DOC"
grep -Fq "object_count=1" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" "$DOC"
grep -Fq "5adf4e77" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-live-import-runbook-pointer-closeout-green-20260612-143829" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LIVE_IMPORT_POINTER_FINAL_GREEN" "$DOC"
grep -Fq "Use scratch import for proofs and tests" "$DOC"
grep -Fq "Use live import only when intentionally changing what the Public Node serves" "$DOC"
grep -Fq "does not claim cross-box green" "$DOC"
grep -Fq "does not claim Alienware has rejoined" "$DOC"
grep -Fq "does not claim live import has been executed" "$DOC"

curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" > /tmp/void-import-stack-status-weighted.json

python3 - <<'PY'
import json
from pathlib import Path
j = json.loads(Path("/tmp/void-import-stack-status-weighted.json").read_text())
assert j.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", j
assert j.get("object_count") == 1, j
print("validated_live_weighted_count_still_1=true")
PY

bash ops/mainnet0/public-node-local-data-drop-live-import-runbook-pointer-closeout-proof.sh
bash ops/mainnet0/public-node-proof-mode-status-card-closeout-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_STATUS_V1_GREEN"
