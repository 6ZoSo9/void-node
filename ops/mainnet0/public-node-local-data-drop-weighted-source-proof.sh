#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "=== VOID Public Node Weighted Local Data Drop Source Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_UI_V1" src/index.ts
grep -Fq "/public-node/local-data-drop/weighted.json" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_DOC_V1" docs/public/public-node-local-data-drop-weighted.md
grep -Fiq "persistent does not mean equal priority" docs/public/public-node-local-data-drop-weighted.md

python3 - <<'PY'
from pathlib import Path
s = Path("src/index.ts").read_text(errors="replace")

self_start = s.find('APP.get("/public-node/self-check-snapshot.json"')
self_end = s.find('APP.get("/public-node/route-manifest.json"', self_start)
self_block = s[self_start:self_end]
assert "/public-node/local-data-drop/weighted.json" in self_block
assert "local_data_drop_weighted" in self_block
assert "local_data_drop_weighted_present: true" in self_block

manifest_start = s.find('APP.get("/public-node/route-manifest.json"')
manifest_end = s.find('APP.get("/public-node/data-weight-record.json"', manifest_start)
manifest_block = s[manifest_start:manifest_end]
assert "/public-node/local-data-drop/weighted.json" in manifest_block
assert "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" in manifest_block

print("validated_weighted_source=true")
print("validated_weighted_self_check_source=true")
print("validated_weighted_route_manifest_source=true")
PY

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_SOURCE_V1_GREEN"
