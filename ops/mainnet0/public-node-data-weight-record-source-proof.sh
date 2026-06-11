#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "=== VOID Public Node Data Weight Record Source Proof v1 ==="
echo "repo=$(pwd)"
echo "head=$(git rev-parse --short HEAD)"

python3 - <<'PY'
from pathlib import Path
import json

src = Path("src/index.ts")
doc = Path("docs/public/public-node-data-weight-record.md")
fixture = Path("fixtures/public-node/data-weight-record-v1.json")
live_proof = Path("ops/mainnet0/public-node-data-weight-record-proof.sh")

for p in [src, doc, fixture, live_proof]:
    assert p.exists(), f"missing {p}"

s = src.read_text(errors="replace")
d = doc.read_text(errors="replace")
f = json.loads(fixture.read_text())

required_source_markers = [
    "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_ROUTE_V1",
    "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_V1",
    "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_SCHEMA_V1",
    "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_UI_V1",
    "/public-node/data-weight-record.json",
    "persistent_does_not_mean_equal_priority",
    "preserve_memory_but_weight_attention",
    "separate_existence_from_trust_and_promotion",
    "requester_work_model_supported",
]

for marker in required_source_markers:
    assert marker in s, marker

self_start = s.find('APP.get("/public-node/self-check-snapshot.json"')
self_end = s.find('APP.get("/public-node/route-manifest.json"', self_start)
assert self_start >= 0 and self_end > self_start, "self-check block not found"
self_block = s[self_start:self_end]

assert "/public-node/data-weight-record.json" in self_block
assert "data_weight_record:" in self_block
assert "data_weight_record_present: true" in self_block

manifest_start = s.find('APP.get("/public-node/route-manifest.json"')
manifest_end = s.find('APP.get("/.well-known/void-public-node.json"', manifest_start)
assert manifest_start >= 0 and manifest_end > manifest_start, "route-manifest block not found"
manifest_block = s[manifest_start:manifest_end]
assert "/public-node/data-weight-record.json" in manifest_block
assert "public_read_only_data_weight_schema" in manifest_block

assert "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_DOC_V1" in d
assert "persistent does not mean equal priority" in d.lower()
assert f["marker"] == "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_FIXTURE_V1"
assert f["route_marker"] == "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_V1"
assert f["policy"]["public_read_only"] is True
assert f["policy"]["trusted_as_network_truth"] is False

states = set(f["record_states"])
for state in ["verified", "stale", "duplicate", "suspicious", "tombstoned"]:
    assert state in states, state

print("validated_source_markers=true")
print("validated_self_check_source=true")
print("validated_route_manifest_source=true")
print("validated_doc=true")
print("validated_fixture=true")
PY

echo "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_SOURCE_PROOF_V1_GREEN"
