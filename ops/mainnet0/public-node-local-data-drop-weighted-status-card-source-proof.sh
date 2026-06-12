#!/usr/bin/env bash
set -euo pipefail

echo "=== VOID Public Node Weighted Local Data Drop Status Card Source Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

grep -Fq "publicNodeLocalDataDropWeightedCard" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_UI_V1" src/index.ts
grep -Fq "publicNodeLocalDataDropWeightedStatus" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_UI_V1" src/index.ts
grep -Fq "Status: checking weighted local objects" src/index.ts
grep -Fq "weighted local " src/index.ts
grep -Fq " live on this node." src/index.ts
grep -Fq 'fetch("/public-node/local-data-drop/weighted.json"' src/index.ts

npm run build --if-present

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_CARD_SOURCE_V1_GREEN"
