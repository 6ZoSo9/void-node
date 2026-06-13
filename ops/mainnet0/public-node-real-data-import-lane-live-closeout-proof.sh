#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OBJECT_ID="${OBJECT_ID:-void-real-user-note-v1.txt}"
SHA256="${SHA256:-ea2fc1377408b245001eb43133988d968c7949b40b58aa6d11fb30744a75ff8b}"
EXPECTED_OBJECT_COUNT="${EXPECTED_OBJECT_COUNT:-4}"
OUT="${OUT:-/tmp/public-node-real-data-import-lane-live-closeout-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_LIVE_CLOSEOUT_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "object_id=$OBJECT_ID"
echo "sha256=$SHA256"
echo "expected_object_count=$EXPECTED_OBJECT_COUNT"
echo "out=$OUT"

curl -fsS "$LOCAL_BASE/public-node/external-base-url.json" > "$OUT/external-base-url.json"
curl -fsS "$LOCAL_BASE/public-node/local-data-drop/weighted.json" > "$OUT/weighted.json"
curl -fsS "$LOCAL_BASE/public-node/local-data-drop/manifest.json" > "$OUT/manifest.json"
curl -fsS "$LOCAL_BASE/public-node/local-data-drop/proof/$SHA256.json" > "$OUT/object-proof.json"
curl -fsS "$LOCAL_BASE/public-node/local-data-drop/by-sha256/$SHA256" > "$OUT/object-by-sha.bin"
curl -fsS "$LOCAL_BASE/public-node/local-data-drop/$OBJECT_ID" > "$OUT/object-by-id.bin"

FETCHED_BY_SHA="$(sha256sum "$OUT/object-by-sha.bin" | awk '{print $1}')"
FETCHED_BY_ID="$(sha256sum "$OUT/object-by-id.bin" | awk '{print $1}')"

test "$FETCHED_BY_SHA" = "$SHA256"
test "$FETCHED_BY_ID" = "$SHA256"

python3 - "$OUT" "$OBJECT_ID" "$SHA256" "$EXPECTED_OBJECT_COUNT" "$FETCHED_BY_SHA" "$FETCHED_BY_ID" <<'PYVERIFY'
import json, sys
from pathlib import Path

out = Path(sys.argv[1])
object_id = sys.argv[2]
sha = sys.argv[3]
expected_count = int(sys.argv[4])
fetched_by_sha = sys.argv[5]
fetched_by_id = sys.argv[6]

external = json.loads((out / "external-base-url.json").read_text())
weighted = json.loads((out / "weighted.json").read_text())
manifest = json.loads((out / "manifest.json").read_text())
proof = json.loads((out / "object-proof.json").read_text())

base = external.get("effective_base_url", "").rstrip("/")
assert base and base != "http://127.0.0.1:4100"

assert weighted.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1"
assert manifest.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_V1"
assert manifest.get("manifest_root_marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_ROOT_V1"
assert proof.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_PROOF_V1"

assert weighted.get("object_count") == expected_count
assert manifest.get("object_count") == expected_count
assert fetched_by_sha == sha
assert fetched_by_id == sha

manifest_by_id = {o["object_id"]: o for o in manifest.get("objects", [])}
weighted_by_id = {r["object_id"]: r for r in weighted.get("weighted_records", [])}

m = manifest_by_id.get(object_id)
assert m, f"missing manifest object: {object_id}"
assert m.get("sha256") == sha
assert m.get("receipt_marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1"
assert m.get("receipt_valid_for_current_object") is True
assert m.get("object_href") == f"{base}/public-node/local-data-drop/{object_id}"
assert m.get("content_address_href") == f"{base}/public-node/local-data-drop/by-sha256/{sha}"
assert m.get("proof_href") == f"{base}/public-node/local-data-drop/proof/{sha}.json"

w = weighted_by_id.get(object_id)
assert w, f"missing weighted object: {object_id}"
assert w.get("sha256") == sha
assert w.get("verification_state") == "verified"
assert w.get("freshness_state") == "fresh"
assert w.get("suspicion_state") == "clean"
assert w.get("tombstone_state") == "active"
assert w.get("storage_tier") == "hot"
assert w.get("ai_visibility") == "high"
assert w.get("promotion_eligible") is True
assert w.get("object_href") == f"{base}/public-node/local-data-drop/{object_id}"
assert w.get("content_address_href") == f"{base}/public-node/local-data-drop/by-sha256/{sha}"
assert w.get("proof_href") == f"{base}/public-node/local-data-drop/proof/{sha}.json"

assert proof.get("object_id") == object_id
assert proof.get("sha256") == sha
assert proof.get("receipt_sha256") == sha
assert proof.get("receipt_valid_for_current_object") is True
assert proof.get("content_address_href") == f"{base}/public-node/local-data-drop/by-sha256/{sha}"
assert proof.get("proof_href") == f"{base}/public-node/local-data-drop/proof/{sha}.json"
assert proof.get("public_upload") is False
assert proof.get("operator_local_import_only") is True
assert proof.get("public_read_only") is True
assert proof.get("trusted_as_network_truth") is False

policy = manifest.get("policy", {})
assert policy.get("public_upload") is False
assert policy.get("operator_local_import_only") is True
assert policy.get("public_read_only") is True
assert policy.get("trusted_as_network_truth") is False

print("live_closeout_checks=green")
print(f"effective_base_url={base}")
print(f"object_count={expected_count}")
print(f"object_id={object_id}")
print(f"sha256={sha}")
PYVERIFY

echo "fetched_by_sha256=$FETCHED_BY_SHA"
echo "fetched_by_object_id=$FETCHED_BY_ID"
echo "public_upload=false"
echo "operator_local_import_only=true"
echo "public_read_only=true"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_LIVE_CLOSEOUT_V1_GREEN"
