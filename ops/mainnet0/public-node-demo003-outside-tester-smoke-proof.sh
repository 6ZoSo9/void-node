#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-demo003-outside-tester-smoke-proof-$STAMP}"

echo "=== VOID Public Node Demo 003 Outside Tester Smoke Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_DEMO003_OUTSIDE_TESTER_SMOKE_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

mkdir -p "$OUT"

grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_DEMO003_FOLDER_CHECKS_V1" src/index.ts
grep -Fq "demo003_folder_checked=true" src/index.ts
grep -Fq "demo003_folder_routes_present: true" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_OUTSIDE_TESTER_SMOKE_DOC_V1" docs/public/public-node-local-data-drop-demo003-folder-fixture.md
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_OUTSIDE_TESTER_SMOKE_POINTER_V1" docs/public/public-node-local-data-drop.md

curl -fsS --max-time 8 "$BASE/public-node/outside-tester-smoke.json" > "$OUT/outside-tester-smoke.json"
curl -fsS --max-time 8 "$BASE/public-node/standalone-outside-tester-smoke.sh" > "$OUT/standalone-outside-tester-smoke.sh"
curl -fsS --max-time 8 "$BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"

grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_V1" "$OUT/outside-tester-smoke.json"
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_DEMO003_FOLDER_CHECKS_V1" "$OUT/outside-tester-smoke.json"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json" "$OUT/outside-tester-smoke.json"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/index.html" "$OUT/outside-tester-smoke.json"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/README.txt" "$OUT/outside-tester-smoke.json"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/metadata.json" "$OUT/outside-tester-smoke.json"

grep -Fq "VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_V1" "$OUT/standalone-outside-tester-smoke.sh"
grep -Fq "demo003-folder-manifest.json" "$OUT/standalone-outside-tester-smoke.sh"
grep -Fq "demo003_folder_checked=true" "$OUT/standalone-outside-tester-smoke.sh"

grep -Fq "demo003_folder_routes_present" "$OUT/self-check-snapshot.json"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json" "$OUT/self-check-snapshot.json"

chmod +x "$OUT/standalone-outside-tester-smoke.sh"
PUBLIC_NODE_BASE="$BASE" OUT="$OUT/standalone-run" bash "$OUT/standalone-outside-tester-smoke.sh" > "$OUT/standalone-run.log"

grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN" "$OUT/standalone-run.log"
grep -Fq "demo003_folder_checked=true" "$OUT/standalone-run.log"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_CARD_V1" "$OUT/standalone-run/public-node.html"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_MANIFEST_ROUTE_V1" "$OUT/standalone-run/demo003-folder-manifest.json"
grep -Fq '"offline_verified":true' "$OUT/standalone-run/demo003-folder-manifest.json"
grep -Fq '"network_fetch_during_import":false' "$OUT/standalone-run/demo003-folder-manifest.json"
grep -Fq '"trusted_as_network_truth":false' "$OUT/standalone-run/demo003-folder-manifest.json"
grep -Fq "VOID Demo 003" "$OUT/standalone-run/demo003-index.html"
grep -Fq "VOID Public Node Local Data Drop Demo 003" "$OUT/standalone-run/demo003-README.txt"
grep -Fq "VOID Demo 003 Folder Fixture" "$OUT/standalone-run/demo003-metadata.json"

echo "outside_smoke_surface_has_demo003=true"
echo "standalone_script_checks_demo003=true"
echo "self_check_has_demo003_routes=true"
echo "standalone_smoke_green=true"
echo "demo003_folder_card_checked=true"
echo "demo003_folder_routes_checked=true"
echo "offline_verified=true"
echo "network_fetch_during_import=false"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_DEMO003_OUTSIDE_TESTER_SMOKE_PROOF_V1_GREEN"
