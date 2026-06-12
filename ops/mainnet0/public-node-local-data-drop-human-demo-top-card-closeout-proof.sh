#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-human-demo-top-card-closeout.md"

echo "=== VOID Public Node Local Data Drop Human Demo Top Card Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-human-demo-top-card-source-proof.sh
test -x ops/mainnet0/public-node-local-data-drop-human-demo-top-card-live-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_CARD_CLOSEOUT_V1" "$DOC"
grep -Fq "publicNodeLocalDataDropHumanDemoTopCard" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_CARD_UI_V1" "$DOC"
grep -Fq "publicNodeLocalDataDropHumanDemoTopStatus" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_STATUS_UI_V1" "$DOC"
grep -Fq "publicNodeLocalDataDropHumanDemoWeightedJump" "$DOC"
grep -Fq "publicNodeLocalDataDropHumanDemoBrowserJump" "$DOC"
grep -Fq "publicNodeLocalDataDropHumanDemoImportJump" "$DOC"
grep -Fq "/public-node/local-data-drop/weighted.json" "$DOC"
grep -Fq "#publicNodeLocalDataDropWeightedCard" "$DOC"
grep -Fq "#publicNodeLocalDataDropObjectBrowserCard" "$DOC"
grep -Fq "#publicNodeLocalDataDropImportOwnDataCard" "$DOC"
grep -Fq "fc24cc59" "$DOC"
grep -Fq "379ca487" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-human-demo-top-card-source-green-20260612-081610" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-human-demo-top-card-live-green-20260612-081923" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_CARD_SOURCE_V1_GREEN" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_CARD_V1_GREEN" "$DOC"

bash ops/mainnet0/public-node-local-data-drop-human-demo-top-card-source-proof.sh
bash ops/mainnet0/public-node-local-data-drop-human-demo-top-card-live-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_CARD_CLOSEOUT_V1_GREEN"
