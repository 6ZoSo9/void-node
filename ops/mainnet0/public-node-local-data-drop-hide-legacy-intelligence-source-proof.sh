#!/usr/bin/env bash
set -euo pipefail

echo "=== VOID Public Node Hide Legacy Intelligence Source Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

grep -Fq 'id="publicNodeDataIntelligenceCard" style="display:none"' src/index.ts
grep -Fq "VOID_PUBLIC_NODE_DATA_INTELLIGENCE_HIDDEN_UNTIL_LIVE_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_DATA_INTELLIGENCE_SEED_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_INTELLIGENCE_UI_V1" src/index.ts
grep -Fq "publicNodeLocalDataDropHumanDemoTopCard" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_CARD_UI_V1" src/index.ts

npm run build --if-present

echo "VOID_PUBLIC_NODE_HIDE_LEGACY_INTELLIGENCE_SOURCE_V1_GREEN"
