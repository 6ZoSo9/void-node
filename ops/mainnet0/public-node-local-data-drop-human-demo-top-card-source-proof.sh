#!/usr/bin/env bash
set -euo pipefail

echo "=== VOID Public Node Local Data Drop Human Demo Top Card Source Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

grep -Fq "publicNodeLocalDataDropHumanDemoTopCard" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_CARD_UI_V1" src/index.ts
grep -Fq "publicNodeLocalDataDropHumanDemoTopStatus" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_STATUS_UI_V1" src/index.ts
grep -Fq "Local data demo" src/index.ts
grep -Fq "Jump straight to the storage demo" src/index.ts
grep -Fq "publicNodeLocalDataDropHumanDemoWeightedJump" src/index.ts
grep -Fq "publicNodeLocalDataDropHumanDemoBrowserJump" src/index.ts
grep -Fq "publicNodeLocalDataDropHumanDemoImportJump" src/index.ts
grep -Fq "#publicNodeLocalDataDropWeightedCard" src/index.ts
grep -Fq "#publicNodeLocalDataDropObjectBrowserCard" src/index.ts
grep -Fq "#publicNodeLocalDataDropImportOwnDataCard" src/index.ts
grep -Fq 'fetch("/public-node/local-data-drop/weighted.json"' src/index.ts
grep -Fq "Demo ready." src/index.ts

grep -Fq "publicNodeLocalDataDropWeightedCard" src/index.ts
grep -Fq "publicNodeLocalDataDropObjectBrowserCard" src/index.ts
grep -Fq "publicNodeLocalDataDropImportOwnDataCard" src/index.ts

npm run build --if-present

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_CARD_SOURCE_V1_GREEN"
