#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-data-weight-record-v1-proof-$(date -u +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== VOID Public Node Data Weight Record v1 Proof ==="
echo "base=$BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_DOC_V1" docs/public/public-node-data-weight-record.md
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_FIXTURE_V1" fixtures/public-node/data-weight-record-v1.json

curl --max-time 15 -fsS "$BASE/public-node/data-weight-record.json" > "$OUT/data-weight-record.json"
curl --max-time 15 -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl --max-time 15 -fsS "$BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"
curl --max-time 15 -fsS "$BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"
curl --max-time 15 -fsS "$BASE/public-node" > "$OUT/public-node.html"

python3 - "$OUT" <<'PY'
import json, sys
from pathlib import Path

out = Path(sys.argv[1])

data = json.loads((out / "data-weight-record.json").read_text())
assert data["marker"] == "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_V1"
assert data["schema"]["marker"] == "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_SCHEMA_V1"
assert data["policy"]["public_read_only"] is True
assert data["policy"]["mutation_from_public"] is False
assert data["policy"]["trusted_as_network_truth"] is False
assert data["doctrine"]["persistent_does_not_mean_equal_priority"] is True

records = data["sample_records"]
assert any(r["verification_state"] == "verified" and r["promotion_eligible"] is True for r in records)
assert any(r["freshness_state"] == "stale" for r in records)
assert any(r["duplicate_state"] == "duplicate" for r in records)
assert any(r["suspicion_state"] == "suspicious" for r in records)
assert any(r["tombstone_state"] == "tombstoned" for r in records)

route_index = json.loads((out / "route-index.json").read_text())
assert any(r.get("path") == "/public-node/data-weight-record.json" for r in route_index["routes"])

route_manifest = json.loads((out / "route-manifest.json").read_text())
assert any(r.get("path") == "/public-node/data-weight-record.json" for r in route_manifest["routes"])

self_check = json.loads((out / "self-check-snapshot.json").read_text())
assert "/public-node/data-weight-record.json" in self_check["expected_routes"]
assert self_check["checks"]["data_weight_record_present"] is True

html = (out / "public-node.html").read_text()
assert "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_UI_V1" in html

print("validated_data_weight_record_route=true")
print("validated_route_index=true")
print("validated_route_manifest=true")
print("validated_self_check=true")
print("validated_public_node_ui=true")
PY

echo "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_V1_GREEN"
