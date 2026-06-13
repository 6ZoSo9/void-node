#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
DATA_DIR="${DATA_DIR:-data_a}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-local-data-drop-demo003-public-folder-serving-proof-$STAMP}"

echo "=== VOID Public Node Demo 003 Public Folder Serving Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_PUBLIC_FOLDER_SERVING_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "data_dir=$DATA_DIR"
echo "out=$OUT"

mkdir -p "$OUT"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_MANIFEST_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FILE_ROUTE_V1" src/index.ts
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json" src/index.ts
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/index.html" src/index.ts
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/README.txt" src/index.ts
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/metadata.json" src/index.ts

DATA_DIR="$DATA_DIR" ops/mainnet0/public-node-local-data-drop-demo003-folder-intake.sh > "$OUT/intake.log"
DATA_DIR="$DATA_DIR" ops/mainnet0/public-node-local-data-drop-demo003-folder-intake-status.sh > "$OUT/status.log"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_V1_IMPORTED" "$OUT/intake.log"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=true" "$OUT/status.log"
grep -Fq "offline_verified=true" "$OUT/status.log"
grep -Fq "network_fetch_during_import=false" "$OUT/status.log"
grep -Fq "trusted_as_network_truth=false" "$OUT/status.log"

curl -fsS --max-time 8 "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl -fsS --max-time 8 "$BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json" > "$OUT/folder-manifest.json"
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/index.html" > "$OUT/index.html"
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/README.txt" > "$OUT/README.txt"
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/metadata.json" > "$OUT/metadata.json"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_MANIFEST_ROUTE_V1" "$OUT/route-index.json"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_MANIFEST_ROUTE_V1" "$OUT/route-manifest.json"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_MANIFEST_ROUTE_V1" "$OUT/folder-manifest.json"
grep -Fq "demo003-folder-fixture-v1" "$OUT/folder-manifest.json"
grep -Fq "trusted_as_network_truth" "$OUT/folder-manifest.json"
grep -Fq "Demo 003" "$OUT/index.html"
grep -Fq "Demo 003" "$OUT/README.txt"
grep -Fq "VOID Demo 003 Folder Fixture" "$OUT/metadata.json"

echo "route_index_has_demo003_folder=true"
echo "route_manifest_has_demo003_folder=true"
echo "folder_manifest_http_ok=true"
echo "folder_index_http_ok=true"
echo "folder_readme_http_ok=true"
echo "folder_metadata_http_ok=true"
echo "offline_verified=true"
echo "network_fetch_during_import=false"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_PUBLIC_FOLDER_SERVING_PROOF_V1_GREEN"
