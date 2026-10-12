#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-tester-request-closeout-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "base=$BASE"
echo "out=$OUT"

curl -fsS "$BASE/public-node/tester-share" > "$OUT/tester-share.html"
curl -fsS "$BASE/public-node/tester-bundle.json" > "$OUT/tester-bundle.json"
curl -fsS "$BASE/public-node/share-link.json" > "$OUT/share-link.json"
curl -fsS "$BASE/public-node/external-tester-copy-pack.json" > "$OUT/external-tester-copy-pack.json"
curl -fsS "$BASE/public-node/first-tester-request-copy-pack.json" > "$OUT/first-tester-request-copy-pack.json"
curl -fsS "$BASE/public-node/tester-result-receipt.json" > "$OUT/tester-result-receipt.json"
curl -fsS "$BASE/public-node/tester-result-intake.json" > "$OUT/tester-result-intake.json"
curl -fsS "$BASE/public-node/tester-lane-summary.json" > "$OUT/tester-lane-summary.json"
curl -fsS "$BASE/public-node/standalone-outside-tester-smoke.sh" > "$OUT/standalone-outside-tester-smoke.sh"
curl -fsS "$BASE/.well-known/void-public-node.json" > "$OUT/well-known.json"
curl -fsS "$BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"
curl -fsS "$BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"
curl -fsS "$BASE/proofs" > "$OUT/proofs.html"

grep -Fq "VOID_PUBLIC_NODE_TESTER_SHARE_PAGE_V1" "$OUT/tester-share.html"
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN" "$OUT/tester-share.html"
grep -Fq "tester-receipt.json" "$OUT/tester-share.html"

grep -Fq "VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_V1" "$OUT/standalone-outside-tester-smoke.sh"
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN" "$OUT/standalone-outside-tester-smoke.sh"
grep -Fq "demo003-folder-fixture-v1" "$OUT/standalone-outside-tester-smoke.sh"

grep -Fq "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_CLOSEOUT_V1" docs/public/public-node-first-tester-request-closeout.md

python3 - "$OUT" <<'PY'
import json, sys
from pathlib import Path

out = Path(sys.argv[1])

def load(name):
    return json.loads((out / name).read_text())

bundle = load("tester-bundle.json")
share = load("share-link.json")
external = load("external-tester-copy-pack.json")
first = load("first-tester-request-copy-pack.json")
receipt = load("tester-result-receipt.json")
intake = load("tester-result-intake.json")
summary = load("tester-lane-summary.json")
well_known = load("well-known.json")
manifest = load("route-manifest.json")
snapshot = load("self-check-snapshot.json")

expected = {
    "tester-bundle.json": ("marker", "VOID_PUBLIC_NODE_TESTER_BUNDLE_V1", bundle),
    "share-link.json": ("marker", "VOID_PUBLIC_NODE_SHARE_LINK_V1", share),
    "external-tester-copy-pack.json": ("marker", "VOID_PUBLIC_NODE_EXTERNAL_TESTER_COPY_PACK_V1", external),
    "first-tester-request-copy-pack.json": ("marker", "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_V1", first),
    "tester-result-receipt.json": ("marker", "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1", receipt),
    "tester-result-intake.json": ("marker", "VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_V1", intake),
    "tester-lane-summary.json": ("marker", "VOID_PUBLIC_NODE_TESTER_LANE_SUMMARY_V1", summary),
    "well-known.json": ("marker", "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1", well_known),
    "route-manifest.json": ("marker", "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1", manifest),
    "self-check-snapshot.json": ("marker", "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1", snapshot),
}

for name, (key, value, doc) in expected.items():
    assert doc.get(key) == value, f"{name} missing {value}"

required_paths = {
    "/public-node/tester-share",
    "/public-node/tester-bundle.json",
    "/public-node/share-link.json",
    "/public-node/external-tester-copy-pack.json",
    "/public-node/first-tester-request-copy-pack.json",
    "/public-node/tester-result-receipt.json",
    "/public-node/tester-result-intake.json",
    "/public-node/tester-lane-summary.json",
    "/public-node/standalone-outside-tester-smoke.sh",
    "/.well-known/void-public-node.json",
    "/public-node/route-manifest.json",
    "/public-node/self-check-snapshot.json",
    "/proofs",
}

routes = {r.get("path") for r in manifest.get("routes", [])}
missing = sorted(required_paths - routes)
assert not missing, f"route-manifest missing paths: {missing}"

for doc_name, doc in [
    ("bundle", bundle),
    ("share", share),
    ("external", external),
    ("first", first),
    ("intake", intake),
    ("summary", summary),
]:
    policy = doc.get("policy") or doc.get("safety_boundary") or {}
    assert policy.get("public_routes_only") is True, f"{doc_name} public_routes_only not true"
    assert policy.get("mutation") is False, f"{doc_name} mutation not false"
    assert policy.get("money_movement") is False, f"{doc_name} money_movement not false"
    assert policy.get("wallet_send") is False, f"{doc_name} wallet_send not false"
    assert policy.get("wc_to_void_swap") is False, f"{doc_name} wc_to_void_swap not false"
    assert policy.get("buy_void_fulfillment") is False, f"{doc_name} buy_void_fulfillment not false"
    assert policy.get("validator_mutation") is False, f"{doc_name} validator_mutation not false"

assert first.get("expected_green_marker") == "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
assert first.get("expected_receipt_file") == "tester-receipt.json"

links = first.get("tester_links", {})
for key in ["tester_share_page", "standalone_smoke_script", "public_node", "route_manifest", "self_check_snapshot", "proofs"]:
    assert key in links and str(links[key]).startswith("http"), f"first tester link missing {key}"

lane = summary.get("tester_lane", {})
for key in [
    "tester_share_page_ready",
    "standalone_smoke_script_ready",
    "copy_pack_ready",
    "result_receipt_schema_ready",
    "result_intake_ready",
    "agent_discovery_ready",
    "route_manifest_ready",
    "self_check_snapshot_ready",
]:
    assert lane.get(key) is True, f"tester lane not ready: {key}"

print("json_checks=green")
PY

echo "tester_share_present=true"
echo "tester_bundle_present=true"
echo "share_link_present=true"
echo "external_copy_pack_present=true"
echo "first_tester_request_copy_pack_present=true"
echo "tester_receipt_present=true"
echo "tester_intake_present=true"
echo "tester_lane_summary_present=true"
echo "standalone_smoke_present=true"
echo "well_known_present=true"
echo "route_manifest_present=true"
echo "self_check_snapshot_present=true"
echo "proofs_present=true"
echo "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_CLOSEOUT_V1_GREEN"
