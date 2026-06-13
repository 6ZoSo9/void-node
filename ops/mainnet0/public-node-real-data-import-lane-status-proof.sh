#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-real-data-import-lane-status-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS_V1" docs/public/public-node-real-data-import-lane-status.md
grep -Fq "object_count=5" docs/public/public-node-real-data-import-lane-status.md
grep -Fq "void-real-user-note-v1.txt" docs/public/public-node-real-data-import-lane-status.md
grep -Fq "void-real-user-note-v2.txt" docs/public/public-node-real-data-import-lane-status.md
echo "doc_status_marker_green=true"

curl -fsS "$LOCAL_BASE/public-node/external-base-url.json" > "$OUT/external-base-url.json"
curl -fsS "$LOCAL_BASE/public-node/local-data-drop/weighted.json" > "$OUT/weighted.json"
curl -fsS "$LOCAL_BASE/public-node/local-data-drop/manifest.json" > "$OUT/manifest.json"
curl -fsS "$LOCAL_BASE/public-node" > "$OUT/public-node.html"
curl -fsS "$LOCAL_BASE/public-node/real-data-import-lane-status.json" > "$OUT/real-data-status-route.json"
curl -fsS "$LOCAL_BASE/public-node/route-index.json" > "$OUT/route-index.json"

grep -Fq "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_UI_V1" "$OUT/public-node.html"
grep -Fq "publicNodeRealDataImportLaneCard" "$OUT/public-node.html"
grep -Fq "/public-node/local-data-drop/weighted.json" "$OUT/public-node.html"
grep -Fq "/public-node/local-data-drop/manifest.json" "$OUT/public-node.html"
grep -Fq "public_upload=false" "$OUT/public-node.html"
echo "real_data_ui_card_green=true"

python3 - "$OUT" <<'PYVERIFY'
import json, sys
from pathlib import Path

out = Path(sys.argv[1])
external = json.loads((out / "external-base-url.json").read_text())
weighted = json.loads((out / "weighted.json").read_text())
manifest = json.loads((out / "manifest.json").read_text())
status_route = json.loads((out / "real-data-status-route.json").read_text())
route_index = json.loads((out / "route-index.json").read_text())

base = external.get("effective_base_url", "").rstrip("/")
assert base and base != "http://127.0.0.1:4100"

assert weighted.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1"
assert manifest.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_V1"
assert weighted.get("object_count") >= 5
assert manifest.get("object_count") >= 5

expected = {
    "void-real-user-note-v1.txt": "ea2fc1377408b245001eb43133988d968c7949b40b58aa6d11fb30744a75ff8b",
    "void-real-user-note-v2.txt": "f172a41ad8e1731ec3cb887954049122821dfe17fe4c3b474137f26f6393ee95",
}

weighted_by_id = {r["object_id"]: r for r in weighted.get("weighted_records", [])}
manifest_by_id = {o["object_id"]: o for o in manifest.get("objects", [])}

for oid, sha in expected.items():
    w = weighted_by_id.get(oid)
    m = manifest_by_id.get(oid)
    assert w, f"missing weighted record: {oid}"
    assert m, f"missing manifest record: {oid}"

    assert w.get("sha256") == sha
    assert w.get("verification_state") == "verified"
    assert w.get("freshness_state") == "fresh"
    assert w.get("suspicion_state") == "clean"
    assert w.get("tombstone_state") == "active"
    assert w.get("storage_tier") == "hot"
    assert w.get("ai_visibility") == "high"
    assert w.get("promotion_eligible") is True

    assert m.get("sha256") == sha
    assert m.get("receipt_marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1"
    assert m.get("receipt_valid_for_current_object") is True
    assert m.get("object_href") == f"{base}/public-node/local-data-drop/{oid}"
    assert m.get("content_address_href") == f"{base}/public-node/local-data-drop/by-sha256/{sha}"
    assert m.get("proof_href") == f"{base}/public-node/local-data-drop/proof/{sha}.json"

policy = manifest.get("policy", {})
assert policy.get("public_upload") is False
assert policy.get("operator_local_import_only") is True
assert policy.get("public_read_only") is True
assert policy.get("trusted_as_network_truth") is False

assert status_route.get("marker") == "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS_ROUTE_V1"
assert status_route.get("real_data_lane_green") is True
assert status_route.get("object_count") >= 5
assert status_route.get("verified_real_objects") == 2
assert status_route.get("policy", {}).get("public_upload") is False
assert status_route.get("policy", {}).get("operator_local_import_only") is True
assert status_route.get("policy", {}).get("public_read_only") is True
assert status_route.get("policy", {}).get("trusted_as_network_truth") is False

status_by_id = {o["object_id"]: o for o in status_route.get("expected_objects", [])}
for oid in expected:
    assert status_by_id[oid]["verified"] is True

routes = {r["path"]: r for r in route_index.get("routes", [])}
assert routes["/public-node/real-data-import-lane-status.json"]["marker"] == "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS_ROUTE_V1"

print("real_data_status_route_green=true")
print("real_data_status_route_index_green=true")
print("real_data_status_checks=green")
print(f"effective_base_url={base}")
print(f"weighted_object_count={weighted.get('object_count')}")
print(f"manifest_object_count={manifest.get('object_count')}")
PYVERIFY

for SHA in \
  ea2fc1377408b245001eb43133988d968c7949b40b58aa6d11fb30744a75ff8b \
  f172a41ad8e1731ec3cb887954049122821dfe17fe4c3b474137f26f6393ee95
do
  curl -fsS "$LOCAL_BASE/public-node/local-data-drop/by-sha256/$SHA" > "$OUT/object-$SHA.bin"
  GOT="$(sha256sum "$OUT/object-$SHA.bin" | awk '{print $1}')"
  test "$GOT" = "$SHA"
  echo "byte_fetch_green=$SHA"
done

echo "public_upload=false"
echo "operator_local_import_only=true"
echo "public_read_only=true"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS_PROOF_V1_GREEN"
