#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-demo003-tester-share-bundle-proof-$STAMP}"

echo "=== VOID Public Node Demo 003 Tester Share Bundle Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_DEMO003_TESTER_SHARE_BUNDLE_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

mkdir -p "$OUT"

grep -Fq "VOID_PUBLIC_NODE_DEMO003_TESTER_SHARE_BUNDLE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_DEMO003_TESTER_SHARE_BUNDLE_DOC_V1" docs/public/public-node-local-data-drop-demo003-folder-fixture.md
grep -Fq "VOID_PUBLIC_NODE_DEMO003_TESTER_SHARE_BUNDLE_POINTER_V1" docs/public/public-node-local-data-drop.md

curl -fsS --max-time 8 "$BASE/public-node/tester-share" > "$OUT/tester-share.html"
curl -fsS --max-time 8 "$BASE/public-node/tester-bundle.json" > "$OUT/tester-bundle.json"
curl -fsS --max-time 8 "$BASE/public-node/share-link.json" > "$OUT/share-link.json"
curl -fsS --max-time 8 "$BASE/public-node/external-tester-copy-pack.json" > "$OUT/external-tester-copy-pack.json"
curl -fsS --max-time 8 "$BASE/public-node/first-tester-request-copy-pack.json" > "$OUT/first-tester-request-copy-pack.json"
curl -fsS --max-time 8 "$BASE/public-node/standalone-outside-tester-smoke.sh" > "$OUT/standalone-outside-tester-smoke.sh"
curl -fsS --max-time 8 "$BASE/public-node/outside-tester-smoke.json" > "$OUT/outside-tester-smoke.json"
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json" > "$OUT/demo003-folder-manifest.json"

grep -Fq "VOID_PUBLIC_NODE_TESTER_SHARE_PAGE_V1" "$OUT/tester-share.html"
grep -Fq "VOID_PUBLIC_NODE_DEMO003_TESTER_SHARE_BUNDLE_V1" "$OUT/tester-share.html"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json" "$OUT/tester-share.html"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/index.html" "$OUT/tester-share.html"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/README.txt" "$OUT/tester-share.html"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/metadata.json" "$OUT/tester-share.html"

grep -Fq "VOID_PUBLIC_NODE_TESTER_BUNDLE_V1" "$OUT/tester-bundle.json"
grep -Fq "VOID_PUBLIC_NODE_DEMO003_TESTER_SHARE_BUNDLE_V1" "$OUT/tester-bundle.json"
grep -Fq '"outside_smoke_checks_this":true' "$OUT/tester-bundle.json"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json" "$OUT/tester-bundle.json"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/index.html" "$OUT/tester-bundle.json"

grep -Fq "Demo 003 verified folder/site" "$OUT/share-link.json"
grep -Fq "demo003_folder_manifest_url" "$OUT/external-tester-copy-pack.json"
grep -Fq "demo003_folder_index_url" "$OUT/external-tester-copy-pack.json"
grep -Fq "tiny verified folder/site path" "$OUT/first-tester-request-copy-pack.json"

grep -Fq "demo003_folder_checked=true" "$OUT/standalone-outside-tester-smoke.sh"
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_DEMO003_FOLDER_CHECKS_V1" "$OUT/outside-tester-smoke.json"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_MANIFEST_ROUTE_V1" "$OUT/demo003-folder-manifest.json"
grep -Fq '"offline_verified":true' "$OUT/demo003-folder-manifest.json"
grep -Fq '"network_fetch_during_import":false' "$OUT/demo003-folder-manifest.json"
grep -Fq '"trusted_as_network_truth":false' "$OUT/demo003-folder-manifest.json"

echo "tester_share_has_demo003=true"
echo "tester_bundle_has_demo003=true"
echo "share_link_mentions_demo003=true"
echo "external_copy_pack_has_demo003=true"
echo "first_tester_copy_mentions_demo003=true"
echo "standalone_smoke_agrees_demo003=true"
echo "outside_smoke_surface_agrees_demo003=true"
echo "offline_verified=true"
echo "network_fetch_during_import=false"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_DEMO003_TESTER_SHARE_BUNDLE_PROOF_V1_GREEN"
