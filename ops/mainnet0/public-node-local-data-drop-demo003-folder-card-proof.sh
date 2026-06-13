#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-local-data-drop-demo003-folder-card-proof-$STAMP}"

echo "=== VOID Public Node Demo 003 Folder Card Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_CARD_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

mkdir -p "$OUT"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_CARD_V1" src/index.ts
grep -Fq "publicNodeLocalDataDropDemo003FolderCard" src/index.ts
grep -Fq "publicNodeLocalDataDropDemo003FolderManifestLink" src/index.ts
grep -Fq "publicNodeLocalDataDropDemo003FolderIndexLink" src/index.ts
grep -Fq "publicNodeLocalDataDropDemo003FolderReadmeLink" src/index.ts
grep -Fq "publicNodeLocalDataDropDemo003FolderMetadataLink" src/index.ts
grep -Fq "trusted_as_network_truth=false" src/index.ts

curl -fsS --max-time 8 "$BASE/public-node" > "$OUT/public-node.html"
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json" > "$OUT/folder-manifest.json"
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/index.html" > "$OUT/index.html"
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/README.txt" > "$OUT/README.txt"
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/metadata.json" > "$OUT/metadata.json"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_CARD_V1" "$OUT/public-node.html"
grep -Fq "publicNodeLocalDataDropDemo003FolderCard" "$OUT/public-node.html"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json" "$OUT/public-node.html"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/index.html" "$OUT/public-node.html"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/README.txt" "$OUT/public-node.html"
grep -Fq "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/metadata.json" "$OUT/public-node.html"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_MANIFEST_ROUTE_V1" "$OUT/folder-manifest.json"
grep -Fq "demo003-folder-fixture-v1" "$OUT/folder-manifest.json"
grep -Fq '"offline_verified":true' "$OUT/folder-manifest.json"
grep -Fq '"network_fetch_during_import":false' "$OUT/folder-manifest.json"
grep -Fq '"trusted_as_network_truth":false' "$OUT/folder-manifest.json"
grep -Fq "VOID Demo 003" "$OUT/index.html"
grep -Fq "VOID Public Node Local Data Drop Demo 003" "$OUT/README.txt"
grep -Fq "VOID Demo 003 Folder Fixture" "$OUT/metadata.json"

echo "public_node_card_present=true"
echo "manifest_link_present=true"
echo "index_link_present=true"
echo "readme_link_present=true"
echo "metadata_link_present=true"
echo "folder_manifest_http_ok=true"
echo "folder_index_http_ok=true"
echo "folder_readme_http_ok=true"
echo "folder_metadata_http_ok=true"
echo "offline_verified=true"
echo "network_fetch_during_import=false"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_CARD_PROOF_V1_GREEN"
