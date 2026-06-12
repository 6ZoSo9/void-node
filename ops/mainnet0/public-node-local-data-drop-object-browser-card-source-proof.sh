#!/usr/bin/env bash
set -euo pipefail

echo "=== VOID Public Node Local Data Drop Object Browser Card Source Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

grep -Fq "publicNodeLocalDataDropObjectBrowserCard" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_UI_V1" src/index.ts
grep -Fq "publicNodeWeightedObjectBrowserWeightedLink" src/index.ts
grep -Fq "publicNodeWeightedObjectBrowserProofLink" src/index.ts
grep -Fq "publicNodeWeightedObjectBrowserObjectLink" src/index.ts
grep -Fq "publicNodeWeightedObjectBrowserShaLink" src/index.ts
grep -Fq "/public-node/local-data-drop/weighted.json" src/index.ts
grep -Fq "/public-node/local-data-drop/proof/0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d.json" src/index.ts
grep -Fq "/public-node/local-data-drop/void-weighted-seed-v1.txt" src/index.ts
grep -Fq "/public-node/local-data-drop/by-sha256/0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d" src/index.ts
grep -Fq "Local Data Drop Object Browser" src/index.ts
grep -Fq "Seed object proof" src/index.ts
grep -Fq "Fetch by object id" src/index.ts
grep -Fq "Fetch by SHA-256" src/index.ts

npm run build --if-present

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_SOURCE_V1_GREEN"
