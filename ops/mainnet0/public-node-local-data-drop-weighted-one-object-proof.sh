#!/usr/bin/env bash
set -euo pipefail

BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
OBJ="void-weighted-seed-v1.txt"
SHA="0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d"

echo "=== VOID Public Node Weighted Local Data Drop One Object Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "object_id=$OBJ"
echo "sha256=$SHA"

curl -fsS --max-time 8 "$BASE/public-node/local-data-drop.json" > /tmp/void-one-object-index.json
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" > /tmp/void-one-object-weighted.json
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/proof/$SHA.json" > /tmp/void-one-object-proof.json
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/$OBJ" > /tmp/void-one-object-content.txt
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/by-sha256/$SHA" > /tmp/void-one-object-content-by-sha.txt

python3 - <<'PY'
import json, hashlib
from pathlib import Path

OBJ = "void-weighted-seed-v1.txt"
SHA = "0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d"

index = json.loads(Path("/tmp/void-one-object-index.json").read_text())
weighted = json.loads(Path("/tmp/void-one-object-weighted.json").read_text())
proof = json.loads(Path("/tmp/void-one-object-proof.json").read_text())
content = Path("/tmp/void-one-object-content.txt").read_bytes()
content_by_sha = Path("/tmp/void-one-object-content-by-sha.txt").read_bytes()

assert index.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_INDEX_V1", index
assert index.get("object_count") >= 1, index
assert any(o.get("object_id") == OBJ and o.get("sha256") == SHA for o in index.get("objects", [])), index

assert weighted.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", weighted
records = weighted.get("weighted_records", [])
assert weighted.get("object_count") == len(records), weighted
record = next((r for r in records if r.get("object_id") == OBJ and r.get("sha256") == SHA), None)
assert record is not None, weighted

assert record.get("verification_state") == "verified", record
assert record.get("storage_tier") == "hot", record
assert record.get("ai_visibility") == "high", record
assert record.get("promotion_eligible") is True, record
assert record.get("suspicion_state") == "clean", record
assert record.get("tombstone_state") == "active", record
assert record.get("source_id") == "operator_local_data_drop", record
assert record.get("trust_score") == 0.9, record
assert record.get("source_weight") == 0.9, record
assert "receipt_valid" in record.get("reason_codes", []), record
assert "public_read_only" in record.get("reason_codes", []), record

assert proof.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_PROOF_V1", proof
assert proof.get("object_id") == OBJ, proof
assert proof.get("sha256") == SHA, proof

assert hashlib.sha256(content).hexdigest() == SHA
assert hashlib.sha256(content_by_sha).hexdigest() == SHA
assert content == content_by_sha

print("validated_local_drop_index_has_seed=true")
print("validated_weighted_record_has_seed=true")
print("validated_weighted_record_scores=true")
print("validated_object_proof=true")
print("validated_content_fetch=true")
print("validated_content_address_fetch=true")
PY

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_ONE_OBJECT_V1_GREEN"
